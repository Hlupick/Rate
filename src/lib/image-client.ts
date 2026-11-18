/** Downscale a picked image in the browser before sending it to the server. */
export async function prepareImage(file: File, maxSize: number): Promise<File> {
  if (!file.type.startsWith('image/')) {
    throw new Error('Нужен файл изображения')
  }
  if (file.size > 15 * 1024 * 1024) {
    throw new Error('Картинка слишком большая (максимум 15 МБ)')
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return file
    context.drawImage(bitmap, 0, 0, width, height)

    const encode = (type: string, quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality))

    const webp = await encode('image/webp', 0.86)
    const blob = webp && webp.size > 0 ? webp : await encode('image/jpeg', 0.86)
    if (!blob || blob.size === 0) return file

    const name = file.name.replace(/\.[^.]+$/, '') + (blob.type === 'image/webp' ? '.webp' : '.jpg')
    return new File([blob], name, { type: blob.type })
  } finally {
    bitmap.close()
  }
}
