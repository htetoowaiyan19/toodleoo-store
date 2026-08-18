import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { translations, SUPPORTED_LANGUAGES, DEFAULT_LANGUAGE } from '../../locales'

const LanguageContext = createContext({
  language: DEFAULT_LANGUAGE,
  setLanguage: () => {},
  t: (key) => key,
  isBurmese: false,
  languages: SUPPORTED_LANGUAGES,
})

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() => {
    const saved = localStorage.getItem('toodleoo_lang')
    if (saved && translations[saved]) {
      return saved
    }
    return DEFAULT_LANGUAGE
  })

  // Synchronize document attributes on language change
  useEffect(() => {
    document.documentElement.lang = language
    if (language === 'my') {
      document.body.classList.add('lang-my')
      document.documentElement.classList.add('lang-my')
    } else {
      document.body.classList.remove('lang-my')
      document.documentElement.classList.remove('lang-my')
    }
  }, [language])

  const setLanguage = useCallback((lang) => {
    if (!translations[lang]) return
    setLanguageState(lang)
    try {
      localStorage.setItem('toodleoo_lang', lang)
    } catch (e) {
      console.error('Failed to save language preference:', e)
    }
  }, [])

  const t = useCallback(
    (keyPath, params = {}) => {
      if (!keyPath || typeof keyPath !== 'string') return ''

      const keys = keyPath.split('.')
      let value = translations[language]

      // Traverse current language dictionary
      for (const k of keys) {
        if (value && typeof value === 'object' && k in value) {
          value = value[k]
        } else {
          value = undefined
          break
        }
      }

      // Fallback to English dictionary if translation is missing
      if (value === undefined && language !== DEFAULT_LANGUAGE) {
        let fallbackValue = translations[DEFAULT_LANGUAGE]
        for (const k of keys) {
          if (fallbackValue && typeof fallbackValue === 'object' && k in fallbackValue) {
            fallbackValue = fallbackValue[k]
          } else {
            fallbackValue = undefined
            break
          }
        }
        value = fallbackValue
      }

      // If still missing, return the key path itself
      if (value === undefined) {
        return keyPath
      }

      if (typeof value !== 'string') {
        return value
      }

      // Interpolate parameters {param}
      return value.replace(/\{(\w+)\}/g, (match, paramName) => {
        return paramName in params ? String(params[paramName]) : match
      })
    },
    [language],
  )

  const value = {
    language,
    setLanguage,
    t,
    isBurmese: language === 'my',
    languages: SUPPORTED_LANGUAGES,
  }

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}

export const useTranslation = useLanguage
