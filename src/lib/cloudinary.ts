import { auth } from './firebase';

// Reject oversized/non-image files before they ever leave the browser.
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/heic']);

/**
 * Uploads a single file to Cloudinary using a server-generated signature.
 * The unsigned upload preset is not used; the server signs every upload
 * so only authenticated Firebase users can write to our Cloudinary account.
 * Format is constrained both client-side (MIME/size) and server-side (the
 * signed allowed_formats), so SVG and oversized/non-image files are rejected.
 */
export async function signedUpload(file: File, kind: 'item' | 'avatar' | 'platform' = 'item'): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error('Image upload is not configured.');

  if (!ALLOWED_MIME.has(file.type)) throw new Error('Only JPG, PNG, WEBP or HEIC images are allowed.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Image is too large (max 10 MB).');

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to upload images.');

  // The server decides the destination folder from the verified uid + kind;
  // callers can't pick an arbitrary folder.
  const signRes = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ kind }),
  });
  if (!signRes.ok) throw new Error('Could not authorize image upload.');
  const { signature, timestamp, api_key, folder: safeFolder, allowed_formats } = await signRes.json() as {
    signature: string; timestamp: number; api_key: string; cloud_name: string; folder: string; allowed_formats: string;
  };

  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', api_key);
  formData.append('folder', safeFolder);
  formData.append('allowed_formats', allowed_formats);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json() as { secure_url?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data?.error?.message ?? 'Image upload failed.');
  return data.secure_url!;
}
