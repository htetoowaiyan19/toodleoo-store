import en from './en'
import my from './my'

export const translations = {
  en,
  my,
}

export const SUPPORTED_LANGUAGES = [
  {
    code: 'en',
    name: 'English',
    nativeName: 'English (US)',
    flag: '🇺🇸',
  },
  {
    code: 'my',
    name: 'Burmese',
    nativeName: 'မြန်မာဘာသာ',
    flag: '🇲🇲',
  },
]

export const DEFAULT_LANGUAGE = 'en'
