import { useState, useEffect } from 'react'
import { useTranslation } from '../../utils/useTranslation'
import { AlertTriangle, ShieldAlert, X, Zap } from 'lucide-react'

export function ImageErrorWarningBanner() {
  const { t } = useTranslation()
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    try {
      if (sessionStorage.getItem('toodleoo_dismissed_img_banner') === 'true') {
        return
      }
    } catch {}

    function handleImageFailed() {
      setIsVisible(true)
    }

    window.addEventListener('toodleoo:image-load-failed', handleImageFailed)
    return () => window.removeEventListener('toodleoo:image-load-failed', handleImageFailed)
  }, [])

  function handleDismiss() {
    setIsVisible(false)
    try {
      sessionStorage.setItem('toodleoo_dismissed_img_banner', 'true')
    } catch {}
  }

  if (!isVisible) return null

  return (
    <div className="relative z-40 bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-b border-amber-500/20 px-3 py-2 text-xs font-semibold text-amber-800 dark:text-amber-300 backdrop-blur-md transition-all">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <p className="leading-snug">
            {t('network.imageErrorBanner')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="shrink-0 rounded-md p-1 hover:bg-amber-500/20 transition cursor-pointer text-amber-700 dark:text-amber-300"
          title={t('network.dismiss')}
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}
