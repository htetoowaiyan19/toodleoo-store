import { useState } from 'react'

export const R2_BASE_URL = 'https://pub-f84efaeb9313408f97f8a6044bb83490.r2.dev/'

export function getProductImageUrl(imageInput) {
  if (!imageInput) return ''
  const str = String(imageInput).trim()
  if (!str) return ''
  if (
    str.startsWith('http://') ||
    str.startsWith('https://') ||
    str.startsWith('data:')
  ) {
    return str
  }
  const cleanPath = str.startsWith('/') ? str.slice(1) : str
  return `${R2_BASE_URL}${cleanPath}`
}

export function ProductImage({
  image,
  name = '',
  className = 'h-full w-full object-cover',
  fallbackClassName = 'text-3xl font-black text-white drop-shadow-sm',
}) {
  const [hasError, setHasError] = useState(false)
  const fullUrl = getProductImageUrl(image)

  const fallbackInitials =
    (image && image.length <= 4 && !image.includes('.')
      ? image
      : name.slice(0, 2)
    ).toUpperCase() || 'TD'

  function handleImageError() {
    setHasError(true)
    try {
      window.dispatchEvent(new CustomEvent('toodleoo:image-load-failed', { detail: { src: fullUrl } }))
    } catch {}
  }

  if (!fullUrl || hasError) {
    return <span className={fallbackClassName}>{fallbackInitials}</span>
  }

  return (
    <img
      src={fullUrl}
      alt={name || 'Product'}
      onError={handleImageError}
      className={className}
    />
  )
}
