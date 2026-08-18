import { useState, useEffect } from 'react'
import { useTranslation } from '../../utils/useTranslation'
import { Globe, Check, Sparkles, ArrowRight } from 'lucide-react'

export function FirstVisitLanguageModal() {
  const { language, setLanguage, t } = useTranslation()
  const [isOpen, setIsOpen] = useState(false)
  const [selected, setSelected] = useState(language)

  useEffect(() => {
    try {
      const hasPrompted = localStorage.getItem('toodleoo_lang_selected')
      if (!hasPrompted) {
        setIsOpen(true)
      }
    } catch {
      // Ignore local storage error
    }
  }, [])

  function handleSelectLanguage(langCode) {
    setSelected(langCode)
    setLanguage(langCode)
  }

  function handleConfirm() {
    try {
      localStorage.setItem('toodleoo_lang_selected', 'true')
    } catch {}
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-black/10 bg-white p-6 shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900 sm:p-7">
        {/* Glow ambient decoration */}
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-[#0b7e74]/20 blur-2xl" />
        <div className="pointer-events-none absolute -left-16 -bottom-16 h-40 w-40 rounded-full bg-purple-500/20 blur-2xl" />

        <div className="relative z-10 space-y-5 text-center">
          {/* Header Icon */}
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0b7e74]/15 text-[#0b7e74] dark:bg-[#0b7e74]/25 dark:text-[#67dccf] shadow-inner">
            <Globe className="h-7 w-7" />
          </div>

          <div>
            <h2 className="text-xl sm:text-2xl font-black text-neutral-900 dark:text-white">
              {t('langPrompt.welcome')}
            </h2>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
              {t('langPrompt.chooseLang')}
            </p>
          </div>

          {/* Language Options Grid */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            {/* English Card */}
            <button
              type="button"
              onClick={() => handleSelectLanguage('en')}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all cursor-pointer ${
                selected === 'en'
                  ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74] ring-2 ring-[#0b7e74]/30 shadow-md dark:border-[#67dccf] dark:text-[#67dccf]'
                  : 'border-black/10 bg-neutral-50 text-neutral-700 hover:border-black/20 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-750'
              }`}
            >
              {selected === 'en' && (
                <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#0b7e74] text-white dark:bg-[#67dccf] dark:text-black">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              )}
              <span className="text-2xl">🇺🇸</span>
              <div>
                <p className="font-bold text-sm">English</p>
                <p className="text-[10px] opacity-75 mt-0.5">United States</p>
              </div>
            </button>

            {/* Burmese Card */}
            <button
              type="button"
              onClick={() => handleSelectLanguage('my')}
              className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center transition-all cursor-pointer ${
                selected === 'my'
                  ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74] ring-2 ring-[#0b7e74]/30 shadow-md dark:border-[#67dccf] dark:text-[#67dccf]'
                  : 'border-black/10 bg-neutral-50 text-neutral-700 hover:border-black/20 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-750'
              }`}
            >
              {selected === 'my' && (
                <div className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#0b7e74] text-white dark:bg-[#67dccf] dark:text-black">
                  <Check className="h-2.5 w-2.5 stroke-[3]" />
                </div>
              )}
              <span className="text-2xl">🇲🇲</span>
              <div>
                <p className="font-bold text-sm">မြန်မာစာ</p>
                <p className="text-[10px] opacity-75 mt-0.5">Burmese</p>
              </div>
            </button>
          </div>

          {/* Change Later Hint */}
          <div className="rounded-lg bg-neutral-100 p-2.5 text-[11px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
            <p>{t('langPrompt.changeLaterHint')}</p>
          </div>

          {/* Action Button */}
          <button
            type="button"
            onClick={handleConfirm}
            className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#0b7e74] py-3 text-xs font-bold text-white shadow-md transition hover:bg-[#096860] active:scale-[0.99]"
          >
            <span>{t('langPrompt.continueBtn')}</span>
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
