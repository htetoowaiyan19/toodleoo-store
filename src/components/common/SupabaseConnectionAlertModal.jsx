import { useState, useEffect } from 'react'
import { useTranslation } from '../../utils/useTranslation'
import { ShieldAlert, RotateCw, Globe, ExternalLink, Zap } from 'lucide-react'

export function SupabaseConnectionAlertModal({ isBlocked, onRetry }) {
  const { t, language, setLanguage } = useTranslation()
  const [retrying, setRetrying] = useState(false)

  if (!isBlocked) return null

  async function handleRetry() {
    setRetrying(true)
    if (onRetry) {
      await onRetry()
    } else {
      window.location.reload()
    }
    setTimeout(() => setRetrying(false), 1000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-red-500/30 bg-white p-6 shadow-2xl transition-all dark:border-red-500/30 dark:bg-neutral-900 sm:p-8 text-center">
        {/* Glow Ambient Red/Orange Warning Blobs */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-red-500/20 blur-3xl" />
        <div className="pointer-events-none absolute -left-20 -bottom-20 h-48 w-48 rounded-full bg-amber-500/20 blur-3xl" />

        <div className="relative z-10 space-y-5">
          {/* Header Icon */}
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/15 text-red-600 dark:bg-red-500/25 dark:text-red-400 shadow-inner">
            <ShieldAlert className="h-9 w-9" />
          </div>

          <div>
            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1 text-[11px] font-bold text-red-600 dark:text-red-400">
              <Zap className="h-3 w-3" /> Network Firewall Notice
            </span>
            <h2 className="mt-2 text-xl sm:text-2xl font-black text-neutral-950 dark:text-white">
              {t('network.vpnRequiredTitle')}
            </h2>
            <p className="mt-2.5 text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              {t('network.vpnRequiredDesc')}
            </p>
          </div>

          {/* Recommended VPN list */}
          <div className="rounded-xl border border-black/10 bg-neutral-50 p-3.5 text-xs font-medium text-neutral-700 dark:border-white/10 dark:bg-neutral-800/60 dark:text-neutral-300 space-y-1 text-left">
            <p className="font-bold text-[#0b7e74] dark:text-[#67dccf]">
              {t('network.recommendedVpns')}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
              • 1.1.1.1 (Cloudflare WARP) — Free, Fast & Easy
              <br />
              • ProtonVPN — Free tier with strong bypass
              <br />
              • Windscribe / SuperVPN / v2ray
            </p>
          </div>

          {/* Controls */}
          <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleRetry}
              disabled={retrying}
              className="flex w-full sm:flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0b7e74] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#096860] active:scale-[0.99] disabled:opacity-50"
            >
              <RotateCw className={`h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              <span>{retrying ? t('common.loading') : t('network.retryConnection')}</span>
            </button>

            {/* Quick Language Toggle */}
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'my' : 'en')}
              className="flex w-full sm:w-auto cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-black/10 px-4 py-3 text-xs font-bold transition hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-neutral-800"
            >
              <Globe className="h-3.5 w-3.5" />
              <span>{language === 'en' ? 'မြန်မာစာ' : 'English'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
