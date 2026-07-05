import supabase from '../config/supabase';
import crypto from 'crypto';

const BUCKET_NAME = 'hrms-documents';

/**
 * Ensures the storage bucket exists. Call once on app startup.
 */
export async function ensureBucket(): Promise<void> {
  const { data } = await supabase.storage.getBucket(BUCKET_NAME);
  if (!data) {
    await supabase.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 10 * 1024 * 1024, // 10 MB
    });
    console.log(`[Storage] Created bucket: ${BUCKET_NAME}`);
  }
}

/**
 * Upload a file buffer to Supabase Storage.
 * @param folder - e.g. 'pan-cards', 'signatures', 'profile-photos'
 * @param fileName - original file name
 * @param buffer - file buffer from multer
 * @param mimeType - e.g. 'image/png', 'application/pdf'
 * @returns The storage path of the uploaded file
 */
export async function uploadFile(
  folder: string,
  fileName: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const ext = fileName.split('.').pop() || 'bin';
  const uniqueName = `${crypto.randomUUID()}.${ext}`;
  const storagePath = `${folder}/${uniqueName}`;

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Storage upload failed: ${error.message}`);
  }

  return storagePath;
}

/**
 * Generate a signed URL for private file access.
 * @param storagePath - the path returned from uploadFile
 * @param expiresInSeconds - default 1 hour
 * @returns A temporary signed URL
 */
export async function getSignedUrl(
  storagePath: string,
  expiresInSeconds: number = 3600
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message}`);
  }

  return data.signedUrl;
}

/**
 * Delete a file from Supabase Storage.
 */
export async function deleteFile(storagePath: string): Promise<void> {
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Storage delete failed: ${error.message}`);
  }
}
