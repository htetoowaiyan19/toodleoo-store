import { useState } from 'react'
import {
  Key,
  Lock,
  Eye,
  EyeOff,
  Copy,
  Check,
  ExternalLink,
  User,
} from 'lucide-react'
import { useTranslation } from '../../utils/useTranslation'

/**
 * SecureDeliveryCard
 * Simple, elegant, and secure component that reveals delivered keys & credentials upon click.
 */
export function SecureDeliveryCard({ order }) {
  const { t } = useTranslation()
  const [isRevealed, setIsRevealed] = useState(false)
  const [copied, setCopied] = useState(null)
  const [showPassword, setShowPassword] = useState(false)

  if (!order || order.status !== 'delivered') {
    return null
  }

  const rawMessage = order.deliveryMessage || ''
  const payload = order.deliveryPayload || {}
  const deliveredAt = order.deliveredAt ? new Date(order.deliveredAt).toLocaleDateString() : 'Recently'

  // Structured fields if available
  const keyContent = payload.key || rawMessage
  const accountLogin = payload.login || payload.username || payload.email || ''
  const accountPassword = payload.password || ''
  const activationLink = payload.link || payload.url || (rawMessage.startsWith('http') ? rawMessage : '')
  const instructions = payload.notes || payload.instructions || ''

  function handleCopy(text, field = 'main') {
    if (!text) return
    navigator.clipboard.writeText(text)
    setCopied(field)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <div className="rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-4">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-black/5 pb-3.5 dark:border-white/5">
        <div className="flex items-center gap-3">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b7e74]/10 text-[#0b7e74] dark:bg-[#67dccf]/10 dark:text-[#67dccf]">
            {isRevealed ? <Key className="h-4.5 w-4.5" /> : <Lock className="h-4.5 w-4.5" />}
          </div>
          <div>
            <h3 className="font-bold text-sm sm:text-base text-neutral-900 dark:text-white flex items-center gap-2">
              <span>{t('account.deliveredCredentials')}</span>
            </h3>
            <p className="text-[11px] text-neutral-400">
              {t('account.deliveredOn', { date: deliveredAt })}
            </p>
          </div>
        </div>

        {/* REVEAL / CONCEAL TOGGLE ACTION */}
        <div className="flex items-center gap-2">
          {isRevealed ? (
            <button
              type="button"
              onClick={() => setIsRevealed(false)}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-md border border-black/10 bg-neutral-100 px-3 py-1 text-xs font-semibold text-neutral-700 hover:bg-neutral-200 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700 transition"
            >
              <EyeOff className="h-3.5 w-3.5" />
              <span>{t('account.concealCode')}</span>
            </button>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              <Lock className="h-3 w-3" />
              <span>{t('account.concealed')}</span>
            </span>
          )}
        </div>
      </div>

      {/* CONTENT AREA */}
      {!isRevealed ? (
        /* CONCEALED / MASKED STATE */
        <div className="rounded-lg border border-dashed border-neutral-300 bg-neutral-50 p-5 text-center dark:border-neutral-700 dark:bg-neutral-950/60 sm:p-6 space-y-3">
          <div className="font-mono text-sm tracking-widest text-neutral-400 select-none">
            •••• •••• •••• ••••
          </div>
          <p className="text-xs text-neutral-500 max-w-md mx-auto">
            {t('account.revealPrivacyNotice')}
          </p>
          <button
            type="button"
            onClick={() => setIsRevealed(true)}
            className="cursor-pointer inline-flex items-center gap-2 rounded-lg bg-[#0b7e74] px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#096860] transition active:scale-[0.99]"
          >
            <Eye className="h-4 w-4" />
            <span>{t('account.revealSecretCode')}</span>
          </button>
        </div>
      ) : (
        /* REVEALED STATE */
        <div className="space-y-3">
          {/* ACCOUNT VIEW (IF ACCOUNT CREDENTIALS) */}
          {accountLogin && accountPassword ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 dark:border-white/10 dark:bg-neutral-950">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
                  <span className="flex items-center gap-1.5"><User className="h-3.5 w-3.5 text-[#0b7e74]" /> {t('account.usernameLogin')}</span>
                  <button
                    type="button"
                    onClick={() => handleCopy(accountLogin, 'login')}
                    className="cursor-pointer text-[#0b7e74] hover:underline inline-flex items-center gap-1 text-xs font-semibold"
                  >
                    {copied === 'login' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                    <span>{copied === 'login' ? t('common.copied') : t('common.copy')}</span>
                  </button>
                </div>
                <p className="mt-1.5 font-mono text-xs sm:text-sm font-bold text-black dark:text-white select-all break-all">
                  {accountLogin}
                </p>
              </div>

              <div className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 dark:border-white/10 dark:bg-neutral-950">
                <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
                  <span className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-[#0b7e74]" /> {t('account.password')}</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="cursor-pointer text-neutral-500 hover:text-black dark:hover:text-white inline-flex items-center gap-1 text-xs"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                      <span>{showPassword ? t('account.hideKey') : t('common.view')}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleCopy(accountPassword, 'password')}
                      className="cursor-pointer text-[#0b7e74] hover:underline inline-flex items-center gap-1 text-xs font-semibold"
                    >
                      {copied === 'password' ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                      <span>{copied === 'password' ? t('common.copied') : t('common.copy')}</span>
                    </button>
                  </div>
                </div>
                <p className="mt-1.5 font-mono text-xs sm:text-sm font-bold text-black dark:text-white select-all break-all">
                  {showPassword ? accountPassword : '••••••••••••'}
                </p>
              </div>
            </div>
          ) : null}

          {/* LICENSE KEY / PLAIN MESSAGE VIEW */}
          {(!accountLogin || !accountPassword) && keyContent ? (
            <div className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 dark:border-white/10 dark:bg-neutral-950 space-y-1.5">
              <div className="flex items-center justify-between text-xs text-neutral-400 font-bold uppercase">
                <span className="flex items-center gap-1.5"><Key className="h-3.5 w-3.5 text-[#0b7e74]" /> {t('account.productKeyCode')}</span>
                <button
                  type="button"
                  onClick={() => handleCopy(keyContent, 'key')}
                  className="cursor-pointer inline-flex items-center gap-1.5 rounded-md bg-[#0b7e74] px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-[#096860]"
                >
                  {copied === 'key' ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                  <span>{copied === 'key' ? t('common.copied') : t('account.copyCode')}</span>
                </button>
              </div>
              <div className="font-mono text-xs sm:text-sm font-bold text-black dark:text-white whitespace-pre-wrap select-all break-all pt-0.5">
                {keyContent}
              </div>
            </div>
          ) : null}

          {/* ACTIVATION LINK (IF ANY) */}
          {activationLink && (
            <div className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 dark:border-white/10 dark:bg-neutral-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase text-neutral-400">{t('account.activationUrl')}</p>
                <p className="mt-0.5 font-mono text-xs text-black dark:text-white select-all break-all font-bold">
                  {activationLink}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleCopy(activationLink, 'link')}
                  className="cursor-pointer rounded-md border border-black/10 px-2.5 py-1 text-xs font-semibold hover:bg-neutral-100 dark:border-white/10 dark:hover:bg-neutral-800"
                >
                  {copied === 'link' ? t('common.copied') : t('common.copy')}
                </button>
                <a
                  href={activationLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md bg-[#0b7e74] px-3 py-1 text-xs font-bold text-white hover:bg-[#096860]"
                >
                  <span>{t('account.openLink')}</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>
          )}

          {/* REDEMPTION INSTRUCTIONS */}
          {instructions && (
            <div className="rounded-lg bg-neutral-100 p-3 text-xs text-neutral-600 dark:bg-neutral-800/60 dark:text-neutral-300">
              <span className="font-bold block text-[10px] uppercase text-neutral-400 mb-0.5">{t('account.instructions')}:</span>
              <p className="whitespace-pre-wrap">{instructions}</p>
            </div>
          )}

          {/* COPY ALL BUTTON */}
          <div className="flex justify-end pt-1">
            <button
              type="button"
              onClick={() => handleCopy(rawMessage || keyContent, 'all')}
              className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-[#0b7e74] hover:underline"
            >
              {copied === 'all' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
              <span>{copied === 'all' ? t('account.allTextCopied') : t('account.copyFullDeliveryText')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// Keep SafeKeyDeliveryCard alias for backwards compatibility
export const SafeKeyDeliveryCard = SecureDeliveryCard
