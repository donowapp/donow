import { auth } from './firebase';

/**
 * Uploads a single file to Cloudinary using a server-generated signature.
 * The unsigned upload preset is not used; the server signs every upload
 * so only authenticated Firebase users can write to our Cloudinary account.
 */
export async function signedUpload(file: File, folder: string): Promise<string> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  if (!cloudName) throw new Error('Image upload is not configured.');

  const token = await auth.currentUser?.getIdToken();
  if (!token) throw new Error('You must be signed in to upload images.');

  const signRes = await fetch('/api/cloudinary/sign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ folder }),
  });
  if (!signRes.ok) throw new Error('Could not authorize image upload.');
  const { signature, timestamp, api_key, folder: safeFolder } = await signRes.json() as {
    signature: string; timestamp: number; api_key: string; cloud_name: string; folder: string;
  };

  const formData = new FormData();
  formData.append('file', file);
  formData.append('signature', signature);
  formData.append('timestamp', String(timestamp));
  formData.append('api_key', api_key);
  formData.append('folder', safeFolder);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
    { method: 'POST', body: formData }
  );
  const data = await res.json() as { secure_url?: string; error?: { message?: string } };
  if (!res.ok) throw new Error(data?.error?.message ?? 'Image upload failed.');
  return data.secure_url!;
}
