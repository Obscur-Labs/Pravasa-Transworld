import { v2 as cloudinary } from 'cloudinary';
import { Readable } from 'stream';

export async function uploadToCloudinary(
  buffer: Buffer,
  folder: string,
  resourceType: 'image' | 'raw' | 'auto' = 'auto'
): Promise<{ url: string; publicId: string }> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: resourceType,
        // Explicitly mark every resource as publicly deliverable so browsers
        // can open the URL directly without authentication headers.
        access_mode: 'public',
      },
      (error, result) => {
        if (error || !result) return reject(error || new Error('Upload failed'));
        resolve({ url: result.secure_url, publicId: result.public_id });
      }
    );
    const readable = new Readable();
    readable.push(buffer);
    readable.push(null);
    readable.pipe(uploadStream);
  });
}

export async function deleteFromCloudinary(publicId: string): Promise<void> {
  await cloudinary.uploader.destroy(publicId);
}

/**
 * Returns a time-limited signed delivery URL for any Cloudinary resource.
 * Works regardless of whether the resource is public or authenticated,
 * because the signature proves the request was authorised by the account owner.
 * expiresInSeconds defaults to 1 hour.
 */
export function getSignedUrl(
  storedUrl: string,
  publicId: string,
  expiresInSeconds = 3600
): string {
  // Detect the resource_type from the stored URL path segment.
  const resourceType = storedUrl.includes('/raw/upload/')
    ? 'raw'
    : storedUrl.includes('/video/upload/')
    ? 'video'
    : 'image';

  return cloudinary.url(publicId, {
    sign_url: true,
    type: 'upload',                                        // matches the upload delivery type
    resource_type: resourceType,
    expires_at: Math.floor(Date.now() / 1000) + expiresInSeconds,
    secure: true,
  });
}
