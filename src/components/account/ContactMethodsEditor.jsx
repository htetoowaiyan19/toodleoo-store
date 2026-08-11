import { useState } from 'react'
import { Phone, Mail, MessageSquare, Send, Globe, CheckCircle2, Info, Plus, Trash2 } from 'lucide-react'

export const CONTACT_TYPES = [
  { value: 'Email', label: 'Email', feePercent: 0, icon: Mail, badge: 'Free', placeholder: 'e.g. user@example.com' },
  { value: 'Messages', label: 'SMS Messages', feePercent: 5, icon: MessageSquare, badge: '+5% SMS Fee', placeholder: 'e.g. +95912345678 (SMS)' },
  { value: 'Phone', label: 'Phone Call', feePercent: 8, icon: Phone, badge: '+8% Call Fee', placeholder: 'e.g. +95912345678 (Voice Call)' },
  { value: 'Facebook', label: 'Facebook', feePercent: 0, icon: Globe, badge: 'Free', placeholder: 'e.g. fb.com/username or Account Name' },
  { value: 'Viber', label: 'Viber', feePercent: 0, icon: Phone, badge: 'Free', placeholder: 'e.g. +95912345678 (Viber)' },
  { value: 'Discord', label: 'Discord', feePercent: 0, icon: MessageSquare, badge: 'Free', placeholder: 'e.g. username#1234 or @username' },
  { value: 'TikTok', label: 'TikTok', feePercent: 0, icon: Globe, badge: 'Free', placeholder: 'e.g. @username' },
  { value: 'Telegram', label: 'Telegram', feePercent: 0, icon: Send, badge: 'Free', placeholder: 'e.g. @username or +959...' },
]

export function calculateContactFeePercent(contactMethods = []) {
  if (!Array.isArray(contactMethods)) return 0
  let fee = 0
  const types = contactMethods.map((c) => c?.type).filter(Boolean)
  if (types.includes('Messages')) fee += 5
  if (types.includes('Phone')) fee += 8
  return fee
}

export function ContactMethodsEditor({ initialMethods = [], onSave, isSaving = false, title = 'Contact Information Priorities' }) {
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
    const unusedType = CONTACT_TYPES.find((t) => !methods.some((m) => m.type === t.value))?.value || 'Telegram'
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

  const PRIORITY_BADGES = [
    { label: 'Primary', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' },
    { label: 'Secondary', color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20' },
    { label: 'Backup', color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20' },
  ]

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-black/5 pb-4 dark:border-white/5">
        <div>
          <h3 className="text-base font-black">{title}</h3>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            Set up to 3 contact methods so admins can reach you for 2FA codes & instant order updates.
          </p>
        </div>

        {activeFeePercent > 0 ? (
          <span className="self-start sm:self-auto rounded-full bg-amber-500/10 px-3 py-1 text-xs font-bold text-amber-600 border border-amber-500/20 dark:text-amber-400">
            +{activeFeePercent}% Fee
          </span>
        ) : (
          <span></span>
        )}
      </div>

      <div className="space-y-4">
        {methods.map((method, idx) => {
          const typeObj = CONTACT_TYPES.find((t) => t.value === method.type) || CONTACT_TYPES[0]
          const IconComp = typeObj.icon
          const priorityBadge = PRIORITY_BADGES[idx] || PRIORITY_BADGES[0]

          return (
            <div
              key={idx}
              className="rounded-2xl border border-black/10 bg-neutral-50 p-4 shadow-sm transition dark:border-white/10 dark:bg-neutral-950/60"
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold border ${priorityBadge.color}`}>
                  {priorityBadge.label}
                </span>

                {methods.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveSlot(idx)}
                    className="p-1 text-neutral-400 hover:text-red-500 transition cursor-pointer"
                    title="Remove Contact Priority"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[160px_1fr]">
                {/* PLATFORM SELECT */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                    Contact Platform
                  </label>
                  <div className="relative mt-1">
                    <select
                      value={method.type}
                      onChange={(e) => handleTypeChange(idx, e.target.value)}
                      className="w-full cursor-pointer appearance-none rounded-xl border border-black/10 bg-white py-2 pl-9 pr-3 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                    >
                      {CONTACT_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>
                          {t.label} {t.feePercent > 0 ? `(+${t.feePercent}%)` : ''}
                        </option>
                      ))}
                    </select>
                    <IconComp className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-neutral-400" />
                  </div>
                </div>

                {/* CONTACT DETAIL INPUT */}
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-neutral-400 flex items-center justify-between">
                    <span>Contact Info / Handle</span>
                    {typeObj.feePercent > 0 && (
                      <span className="text-amber-600 dark:text-amber-400 text-[10px]">
                        Adds +{typeObj.feePercent}% Fee for Admin {method.type === 'Messages' ? 'SMS' : 'Call'} Costs
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    value={method.value}
                    onChange={(e) => handleValueChange(idx, e.target.value)}
                    placeholder={typeObj.placeholder}
                    className="mt-1 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
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
          className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-black/20 bg-white px-4 py-2 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/20 dark:bg-neutral-900 dark:text-neutral-300 cursor-pointer"
        >
          <Plus className="h-4 w-4 text-[#0b7e74]" /> Add Backup Contact Priority ({methods.length + 1}/3)
        </button>
      )}

      {/* FEE NOTICE BANNER */}
      <div className="rounded-2xl bg-blue-500/10 p-3.5 text-xs text-blue-800 dark:text-blue-300 border border-blue-500/20 flex gap-2.5">
        <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
        <div className="space-y-1">
          <p className="font-bold">Contact Method Fees Notice:</p>
          <p className="text-[11px] text-blue-700/80 dark:text-blue-300/80 leading-relaxed">
            Free platforms (Email, Facebook, Viber, Discord, TikTok, Telegram) incur <strong>0% fee</strong>.
            Selecting <strong>Messages (+5% SMS Fee)</strong> or <strong>Phone (+8% Call Fee)</strong> adds a small fee at checkout to cover admin SMS & Call costs when requesting 2FA codes.
          </p>
        </div>
      </div>

      {onSave && (
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSaving}
            className="cursor-pointer rounded-xl bg-[#0b7e74] px-6 py-2.5 text-xs font-black text-white transition hover:bg-[#096860] disabled:opacity-50"
          >
            {isSaving ? 'Saving Contact Methods...' : 'Save Contact Priorities'}
          </button>

          {savedSuccess && (
            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="h-4 w-4" /> Contact methods saved!
            </span>
          )}
        </div>
      )}
    </form>
  )
}
