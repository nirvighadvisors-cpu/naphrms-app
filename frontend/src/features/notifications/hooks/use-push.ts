import { useEffect, useState } from 'react';
import apiClient from '@/lib/api-client';

/**
 * Hook to manage Web Push notification subscription.
 * - Requests notification permission from the browser.
 * - Subscribes to push notifications using the VAPID key from the backend.
 * - Sends the subscription to the backend for storage.
 */
export function usePushNotifications() {
  const [permission, setPermission] = useState<NotificationPermission>(
    typeof Notification !== 'undefined' ? Notification.permission : 'default'
  );
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Check existing subscription on mount
  useEffect(() => {
    checkExistingSubscription();
  }, []);

  async function checkExistingSubscription() {
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.warn('[Push] Failed to check subscription:', err);
    }
  }

  /**
   * Request notification permission and subscribe to push.
   */
  async function subscribeToPush() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.warn('[Push] Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);

    try {
      // 1. Request permission
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm !== 'granted') {
        console.log('[Push] Notification permission denied');
        setIsLoading(false);
        return false;
      }

      // 2. Get VAPID public key from backend
      const { data: vapidData } = await apiClient.get('/push/vapid-key');
      const vapidPublicKey = vapidData.data.publicKey;

      if (!vapidPublicKey) {
        console.warn('[Push] No VAPID key configured on the server');
        setIsLoading(false);
        return false;
      }

      // 3. Subscribe with the service worker
      const registration = await navigator.serviceWorker.ready;

      // Convert VAPID key to Uint8Array
      const applicationServerKey = urlBase64ToUint8Array(vapidPublicKey);

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey as any,
      });

      // 4. Send subscription to backend
      const subJSON = subscription.toJSON();
      await apiClient.post('/push/subscribe', {
        endpoint: subJSON.endpoint,
        keys: {
          p256dh: subJSON.keys?.p256dh,
          auth: subJSON.keys?.auth,
        },
      });

      setIsSubscribed(true);
      console.log('[Push] Successfully subscribed to push notifications');
      return true;
    } catch (err) {
      console.error('[Push] Failed to subscribe:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }

  /**
   * Unsubscribe from push notifications.
   */
  async function unsubscribeFromPush() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Remove from backend
        await apiClient.delete('/push/unsubscribe', {
          data: { endpoint: subscription.endpoint },
        });

        // Unsubscribe from browser
        await subscription.unsubscribe();
        setIsSubscribed(false);
        console.log('[Push] Successfully unsubscribed from push notifications');
      }
    } catch (err) {
      console.error('[Push] Failed to unsubscribe:', err);
    }
  }

  return {
    permission,
    isSubscribed,
    isLoading,
    subscribeToPush,
    unsubscribeFromPush,
    isSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
  };
}

/**
 * Convert a URL-safe base64 string to a Uint8Array (required by PushManager).
 */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
