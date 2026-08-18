import { useState, useMemo } from 'react'
import { Phone, Mail, MessageSquare, Send, Globe, CheckCircle2, Info, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from '../../utils/useTranslation'

export const RAW_CONTACT_TYPES = [
  { value: 'Email', key: 'email', placeholderKey: 'emailPlaceholder', feePercent: 0, icon: Mail },
  { value: 'Messages', key: 'messages', placeholderKey: 'messagesPlaceholder', feePercent: 5, icon: MessageSquare },
  { value: 'Phone', key: 'phone', placeholderKey: 'phonePlaceholder', feePercent: 8, icon: Phone },
  { value: 'Facebook', key: 'facebook', placeholderKey: 'facebookPlaceholder', feePercent: 0, icon: Globe },
  { value: 'Viber', key: 'viber', placeholderKey: 'viberPlaceholder', feePercent: 0, icon: Phone },
  { value: 'Discord', key: 'discord', placeholderKey: 'discordPlaceholder', feePercent: 0, icon: MessageSquare },
  { value: 'TikTok', key: 'tiktok', placeholderKey: 'tiktokPlaceholder', feePercent: 0, icon: Globe },
  { value: 'Telegram', key: 'telegram', placeholderKey: 'telegramPlaceholder', feePercent: 0, icon: Send },
]

export function calculateContactFeePercent(contactMethods = []) {
  if (!Array.isArray(contactMethods)) return 0
  let fee = 0
  const types = contactMethods.map((c) => c?.type).filter(Boolean)
  if (types.includes('Messages')) fee += 5
  if (types.includes('Phone')) fee += 8
  return fee
}

export function ContactMethodsEditor({ initialMethods = [], onSave, isSaving = false, title }) {
  const { t } = useTranslation()
  const displayTitle = title || t('contactMethods.title')

  const contactTypes = useMemo(() => {
    return RAW_CONTACT_TYPES.map((tItem) => ({
      ...tItem,
      label: t(`contactMethods.${tItem.key}`, tItem.value),
      placeholder: t(`contactMethods.${tItem.placeholderKey}`, 'Enter contact...'),
      badge: tItem.feePercent > 0 ? t('contactMethods.fee', { fee: tItem.feePercent }) : t('contactMethods.free'),
    }))
  }, [t])

  const [methods, setMethods] = useState(() => {
    if (Array.isArray(initialMethods) && initialMethods.length > 0) {
      return initialMethods.slice(0, 3).map((item, idx) => ({
        priority: idx + 1,
        type: item.type || 'Email',
        value: item.value || '',
      }))
    }
    return [{ priority: 1, type: 'Email', value: '' }]
  })
  const [savedSuccess, setSavedSuccess] = useState(false)

  const activeFeePercent = calculateContactFeePercent(methods)

  function handleTypeChange(index, newType) {
    setMethods((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, type: newType } : item)),
    )
  }

  function handleValueChange(index, newValue) {
    setMethods((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, value: newValue } : item)),
    )
  }

  function handleAddSlot() {
    if (methods.length >= 3) return
    const unusedType = contactTypes.find((ct) => !methods.some((m) => m.type === ct.value))?.value || 'Telegram'
    setMethods((prev) => [...prev, { priority: prev.length + 1, type: unusedType, value: '' }])
  }

  function handleRemoveSlot(index) {
    setMethods((prev) =>
      prev
        .filter((_, idx) => idx !== index)
        .map((item, idx) => ({ ...item, priority: idx + 1 })),
    )
  }

  async function handleFormSubmit(e) {
    e.preventDefault()
    setSavedSuccess(false)
    const validMethods = methods
      .map((m, idx) => ({ priority: idx + 1, type: m.type, value: m.value.trim() }))
      .filter((m) => m.value.length > 0)

    if (onSave) {
      await onSave(validMethods)
      setSavedSuccess(true)
      setTimeout(() => setSavedSuccess(false), 3000)
    }
  }

  const priorityBadges = [
    { label: t('contactMethods.primaryPriority'), color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    { label: t('contactMethods.secondaryPriority'), color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    { label: t('contactMethods.backupPriority'), color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  ]

  return (
    <form onSubmit={handleFormSubmit} className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-black/5 pb-3.5 dark:border-white/5">
        <div>
          <h3 className="text-sm sm:text-base font-bold">{displayTitle}</h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('contactMethods.desc')}
          </p>
        </div>

        {activeFeePercent > 0 ? (
          <span className="self-start sm:self-auto rounded-md bg-amber-500/10 px-2.5 py-0.5 text-xs font-bold text-amber-600 border border-amber-500/20 dark:text-amber-400">
            {t('contactMethods.fee', { fee: activeFeePercent })}
          </span>
        ) : (
          <span></span>
        )}
      </div>

      <div className="space-y-3">
        {methods.map((method, idx) => {
          const typeObj = contactTypes.find((ct) => ct.value === method.type) || contactTypes[0]
          const IconComp = typeObj.icon
          const priorityBadge = priorityBadges[idx] || priorityBadges[0]

          return (
            <div
              key={idx}
              className="rounded-xl border border-black/10 bg-neutral-50 p-3.5 shadow-sm transition dark:border-white/10 dark:bg-neutral-950/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold border ${priorityBadge.color}`}>
                  {priorityBadge.label}
                </span>

                {methods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(idx)}
                    className="p-1 text-neutral-400 hover:text-red-500 transition cursor-pointer"
                    title={t('contactMethods.removeTitle')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="mt-2.5 grid gap-2.5 sm:grid-cols-[160px_1fr]">
                {/* PLATFORM SELECT */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    {t('contactMethods.platform')}
                  </label>
                  <div className="relative mt-1">
                    <select
                      value={method.type}
                      onChange={(e) => handleTypeChange(idx, e.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-lg border border-black/10 bg-white py-1.5 pl-8 pr-3 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                    >
                      {contactTypes.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label} {ct.feePercent > 0 ? `(+${ct.feePercent}%)` : ''}
                        </option>
                      ))}
                    </select>
                    <IconComp className="pointer-events-none absolute left-2.5 top-2 h-3.5 w-3.5 text-neutral-400" />
                  </div>
                </div>

                {/* CONTACT DETAIL INPUT */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                    <span>{t('contactMethods.infoHandle')}</span>
                    {typeObj.feePercent > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                        {t('contactMethods.feeNoticeSmall', { fee: typeObj.feePercent, type: method.type === 'Messages' ? 'SMS' : 'Call' })}
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={method.value}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    placeholder={typeObj.placeholder}
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                    required={idx === 0}
                  />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {methods.length < 3 && (
        <button
          type="button"
          onClick={handleAddSlot}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-black/20 bg-white px-3.5 py-1.5 text-xs font-semibold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/20 dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer"
        >
          <Plus className="h-3.5 w-3.5 text-[#0b7e74]" /> {t('contactMethods.addBackup', { current: methods.length + 1 })}
        </button>
      )}

      {/* FEE NOTICE BANNER */}
      <div className="rounded-lg bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300 border border-blue-500/20 flex gap-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-0.5">
          <p className="font-bold text-xs">{t('contactMethods.feeNoticeTitle')}</p>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
            {t('contactMethods.feeNoticeText')}
          </p>
        </div>
      </div>

      {onSave && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="cursor-pointer rounded-lg bg-[#0b7e74] px-5 py-2 text-xs font-bold text-white transition hover:bg-[#096860] active:scale-[0.99] disabled:opacity-50"
          >
            {isSaving ? t('contactMethods.savingBtn') : t('contactMethods.saveBtn')}
          </button>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-3.5 w-3.5" /> {t('contactMethods.savedSuccess')}
            </span>
          )}
        </div>
      )}
    </form>
  )
}


