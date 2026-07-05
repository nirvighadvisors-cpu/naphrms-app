import React, { useRef, useState, useCallback } from 'react';
import Webcam from 'react-webcam';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

interface LiveCameraCaptureProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (base64Image: string) => void;
  title?: string;
}

export function LiveCameraCapture({ isOpen, onClose, onConfirm, title = "Live Face Capture" }: LiveCameraCaptureProps) {
  const webcamRef = useRef<Webcam>(null);
  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);

  const capture = useCallback(() => {
    setIsCapturing(true);
    // Slight delay to allow UI to update (simulate shutter)
    setTimeout(() => {
      const imageSrc = webcamRef.current?.getScreenshot();
      if (imageSrc) {
        setImgSrc(imageSrc);
      }
      setIsCapturing(false);
    }, 150);
  }, [webcamRef]);

  const retake = () => {
    setImgSrc(null);
  };

  const confirm = () => {
    if (imgSrc) {
      onConfirm(imgSrc);
    }
  };

  const handleUserMediaError = (error: string | DOMException) => {
    console.error("Webcam Error:", error);
    setPermissionDenied(true);
  };

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setImgSrc(null);
      setPermissionDenied(false);
    }
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-surface border-border/50 sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Please look directly at the camera. Ensure your face is clearly visible.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 flex flex-col items-center justify-center min-h-[300px]">
          {permissionDenied ? (
            <div className="text-center space-y-4 p-4 border border-error/20 bg-error/5 rounded-xl">
              <div className="flex justify-center">
                <div className="w-12 h-12 rounded-full bg-error/10 flex items-center justify-center text-error">
                  <AlertTriangle size={24} />
                </div>
              </div>
              <h3 className="font-semibold text-text">Camera Access Denied</h3>
              <p className="text-sm text-text-muted">
                Camera access is required for attendance verification. Please click the padlock icon in your browser's address bar, allow camera access, and then refresh the page.
              </p>
            </div>
          ) : (
            <div className="relative w-full max-w-[320px] rounded-2xl overflow-hidden shadow-lg border-4 border-surface-offset aspect-[4/3] bg-black flex items-center justify-center">
              {!imgSrc ? (
                <Webcam
                  audio={false}
                  ref={webcamRef}
                  screenshotFormat="image/jpeg"
                  videoConstraints={{
                    facingMode: "user",
                    width: 640,
                    height: 480
                  }}
                  onUserMediaError={handleUserMediaError}
                  className={`w-full h-full object-cover transition-opacity duration-200 ${isCapturing ? 'opacity-0' : 'opacity-100'}`}
                />
              ) : (
                <img src={imgSrc} alt="Captured Face" className="w-full h-full object-cover" />
              )}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          {!permissionDenied && (
            <>
              {!imgSrc ? (
                <>
                  <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
                    Cancel
                  </Button>
                  <Button onClick={capture} disabled={isCapturing} className="w-full sm:w-auto">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture Photo
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={retake} className="w-full sm:w-auto">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Retake
                  </Button>
                  <Button onClick={confirm} className="w-full sm:w-auto" disabled={!imgSrc}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Confirm & Continue
                  </Button>
                </>
              )}
            </>
          )}
          {permissionDenied && (
            <Button variant="outline" onClick={onClose} className="w-full">
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
