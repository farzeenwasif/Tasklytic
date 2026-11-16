// Shrink a photo in the browser before it is uploaded for the AI:
// phone photos are often 5-10 MB, the AI only needs about 1600px.
export async function shrinkImage(file, maxSide = 1600, quality = 0.85) {
  if (!file || !file.type?.startsWith('image/')) throw new Error('Choose an image file')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('That image could not be opened. Try a JPG or PNG.'))
      el.src = url
    })
    const scale = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale))
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = '#ffffff' // transparent PNG screenshots would turn black as JPEG
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
    if (!blob) throw new Error('That image could not be read')
    return blob
  } finally {
    URL.revokeObjectURL(url)
  }
}

// FormData with the shrunk image and extra text fields
export async function imageForm(file, fields = {}) {
  const form = new FormData()
  form.append('image', await shrinkImage(file), 'image.jpg')
  Object.entries(fields).forEach(([k, v]) => v !== undefined && v !== '' && form.append(k, v))
  return form
}
