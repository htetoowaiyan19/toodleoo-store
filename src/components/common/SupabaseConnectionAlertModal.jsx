import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from '../../utils/useTranslation'
import { checkSupabaseHealth } from '../../utils/supabaseHealth'
import { ShieldAlert, RotateCw, Globe, ExternalLink, Zap, AlertTriangle } from 'lucide-react'

export function SupabaseConnectionAlertModal({ isBlocked: propBlocked, onRetry }) {
  const { t, language, setLanguage } = useTranslation()
  const [internalBlocked, setInternalBlocked] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [retryFailedMsg, setRetryFailedMsg] = useState('')

  const isBlocked = propBlocked || internalBlocked

  // Initial fast health check on mount
  useEffect(() => {
    let active = true

    async function runCheck() {
      const result = await checkSupabaseHealth(3500)
      if (active && !result.ok) {
        setInternalBlocked(true)
      }
    }

    runCheck()

    // Global custom event listener
    function handleBlockedEvent() {
      setInternalBlocked(true)
    }

    // Global network error & unhandled rejection listeners
    function handleWindowError(event) {
      const targetStr = String(event?.message || event?.filename || event?.target?.src || '')
      if (
        targetStr.includes('supabase.co') ||
        targetStr.includes('ERR_CONNECTION_TIMED_OUT') ||
        targetStr.includes('ERR_NAME_NOT_RESOLVED') ||
        targetStr.includes('ERR_CONNECTION_REFUSED')
      ) {
        setInternalBlocked(true)
      }
    }

    function handleUnhandledRejection(event) {
      const reasonStr = String(event?.reason?.message || event?.reason || '')
      if (
        reasonStr.includes('supabase.co') ||
        reasonStr.includes('Failed to fetch') ||
        reasonStr.includes('ERR_CONNECTION_TIMED_OUT') ||
        reasonStr.includes('NetworkError') ||
        reasonStr.includes('Network request failed')
      ) {
        setInternalBlocked(true)
      }
    }

    window.addEventListener('toodleoo:supabase-blocked', handleBlockedEvent)
    window.addEventListener('error', handleWindowError, true)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)

    return () => {
      active = false
      window.removeEventListener('toodleoo:supabase-blocked', handleBlockedEvent)
      window.removeEventListener('error', handleWindowError, true)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])

  const handleRetry = useCallback(async () => {
    setRetrying(true)
    setRetryFailedMsg('')

    const health = await checkSupabaseHealth(4000)

    if (health.ok) {
      setInternalBlocked(false)
      if (onRetry) {
        await onRetry()
      } else {
        window.location.reload()
      }
      setRetrying(false)
    } else {
      setRetrying(false)
      setRetryFailedMsg(
        language === 'my'
          ? 'ဆာဗာနှင့် ချိတ်ဆက်၍ မရသေးပါ။ ကျေးဇူးပြု၍ VPN ဖွင့်ထားခြင်း ရှိမရှိ စစ်ဆေးပါ။'
          : 'Still unable to connect to server. Please verify your VPN is enabled and try again.',
      )
    }
  }, [language, onRetry])

  if (!isBlocked) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md animate-fade-in">
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
          <div className="rounded-xl border border-black/10 bg-neutral-50 p-3.5 text-xs font-medium text-neutral-700 dark:border-white/10 dark:bg-neutral-800/60 dark:text-neutral-300 space-y-1.5 text-left">
            <p className="font-bold text-[#0b7e74] dark:text-[#67dccf]">
              {t('network.recommendedVpns')}
            </p>
            <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
              • <strong>1.1.1.1 (Cloudflare WARP)</strong> — Free, Fast & Easy
              <br />
              • <strong>ProtonVPN</strong> — Free tier with strong bypass
              <br />
              • <strong>Windscribe / SuperVPN / v2ray</strong>
            </p>
          </div>

          {retryFailedMsg && (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/10 p-3 text-xs font-semibold text-amber-700 dark:text-amber-300 text-left">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{retryFailedMsg}</span>
            </div>
          )}

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
