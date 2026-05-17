/** Chat media without Firebase Storage — uses compressed base64 in Firestore. */

const MAX_IMAGE_BYTES = 450_000
const MAX_AUDIO_BYTES = 350_000

export function compressImage(file, maxDim = 800, quality = 0.72) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(maxDim / img.width, maxDim / img.height, 1)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(
        blob => {
          URL.revokeObjectURL(url)
          if (blob) resolve(blob)
          else reject(new Error('Compression failed'))
        },
        'image/jpeg',
        quality,
      )
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Invalid image'))
    }
    img.src = url
  })
}

export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}

export async function prepareImageForFirestore(file) {
  let blob = await compressImage(file, 800, 0.72)
  let dataUrl = await blobToDataUrl(blob)
  let quality = 0.65
  while (dataUrl.length > MAX_IMAGE_BYTES && quality > 0.35) {
    quality -= 0.1
    blob = await compressImage(file, 640, quality)
    dataUrl = await blobToDataUrl(blob)
  }
  if (dataUrl.length > MAX_IMAGE_BYTES) {
    throw new Error('Image is too large — try a smaller photo')
  }
  return dataUrl
}

export async function prepareAudioForFirestore(blob) {
  const dataUrl = await blobToDataUrl(blob)
  if (dataUrl.length > MAX_AUDIO_BYTES) {
    throw new Error('Voice message is too long — try a shorter recording')
  }
  return dataUrl
}

export function getAudioMimeType() {
  if (typeof MediaRecorder === 'undefined') return null
  const types = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
  return types.find(t => MediaRecorder.isTypeSupported(t)) || null
}
