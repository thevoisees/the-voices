import { dataUrlToJpegBlob } from './image'

const cloud = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined
const preset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined

export const cloudinaryConfigured = Boolean(cloud && preset)

/** Browser-safe unsigned upload — never send the API secret from the client. */
export async function uploadMissingPhotoToCloudinary(
  id: string,
  dataUrl: string,
): Promise<string | null> {
  if (!cloudinaryConfigured || !cloud || !preset) return null

  const blob = dataUrlToJpegBlob(dataUrl)
  const body = new FormData()
  body.append('file', blob, `${id}.jpg`)
  body.append('upload_preset', preset)
  body.append('public_id', `the-voices/missing/${id}`)

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body,
  })
  const json = (await res.json()) as { secure_url?: string; error?: { message?: string } }
  if (!res.ok || !json.secure_url) {
    console.warn('Cloudinary upload failed', json.error?.message || res.status)
    return null
  }
  return json.secure_url
}
