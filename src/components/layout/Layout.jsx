import { useState, useEffect, useMemo } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useCart } from '../../utils/useCart'
import { useAuth } from '../../utils/useAuth'
import { useTranslation } from '../../utils/useTranslation'
import { GlobalSearch } from '../product/GlobalSearch'
import { formatCurrency } from '../../utils/format'
import logoImage from '../../assets/logo/logo_toodleoo-nobg.png'
import {
  Wallet,
  RotateCw,
  Home,
  ShoppingBag,
  Package,
  User,
  ShieldCheck,
  Search,
  ShoppingCart,
  Sparkles,
  Crown,
  Moon,
  ArrowLeft,
  X,
} from 'lucide-react'
import { getUserSubscription } from '../../utils/subscriptionPlans'

export function Layout({ children, onCartOpen }) {
  const { count } = useCart()
  const { isAdmin, profile, user, refreshProfile } = useAuth()
  const { t } = useTranslation()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false)
  const location = useLocation()

  const subData = useMemo(() => getUserSubscription(profile), [profile])

  async function handleRefreshWallet(e) {
    if (e) e.preventDefault()
    setIsRefreshingWallet(true)
    if (refreshProfile) await refreshProfile()
    setTimeout(() => setIsRefreshingWallet(false), 500)
  }

  const visibleNavItems = [
    { to: '/', label: t('nav.home') },
    { to: '/store', label: t('nav.store') },
    { to: '/custom-order', label: t('customOrder.title').split(' ')[0] || 'Custom' },
    ...(isAdmin ? [{ to: '/admin', label: t('nav.admin') }] : []),
  ]

  // Listen for Cmd+K / Ctrl+K keyboard shortcut to open search
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen((prev) => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <div className="min-h-screen bg-[#f7fbfa] pb-20 md:pb-0 text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-white">
      {/* STANDARD HEADER */}
      <header className="sticky top-0 z-30 px-2.5 py-2 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1.5 sm:gap-2.5 rounded-full border border-black/10 bg-white/85 px-3 py-1.5 sm:px-5 sm:py-2 shadow-lg shadow-black/5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-900/85 dark:shadow-black/30">
          {/* BRAND LOGO */}
          <Link to="/" className="flex items-center pl-0.5 shrink-0">
            <img
              src={logoImage}
              alt="Toodleoo Store"
              className="h-6 sm:h-8 md:h-9 w-auto object-contain transition hover:opacity-90"
            />
          </Link>

          {/* MAIN NAVIGATION BAR (DESKTOP ONLY) */}
          <nav className="hidden items-center gap-1 md:flex">
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center justify-center rounded-full px-3.5 py-1.5 text-xs font-bold transition-all duration-200 ${isActive
                    ? 'text-[#0b7e74] bg-[#0b7e74]/10 dark:text-[#67dccf] dark:bg-[#0b7e74]/20'
                    : 'text-neutral-600 hover:text-neutral-950 hover:bg-black/5 dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* HEADER ACTION BUTTONS */}
          <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
            {/* SEARCH ICON BUTTON */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label={t('common.search')}
              title={`${t('common.search')} (${t('nav.searchShortcut')})`}
              className="flex h-8 w-8 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded-full text-neutral-600 transition hover:text-black hover:bg-black/5 active:scale-[0.95] dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10 shrink-0"
            >
              <Search className="h-4 w-4" />
            </button>

            {/* WALLET BALANCE & REFRESH ICON */}
            {user && (
              <div className="flex h-8 sm:h-9 items-center gap-1 rounded-full px-2 sm:px-2.5 text-[11px] sm:text-xs font-bold text-neutral-900 hover:bg-black/5 dark:text-white dark:hover:bg-white/10 transition shrink-0">
                <Link
                  to="/wallet"
                  className="flex items-center gap-1 hover:text-[#0b7e74] transition"
                  title={t('account.walletTile')}
                >
                  <Wallet className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[#0b7e74]" />
                  <span className="font-mono font-black">
                    {Number(profile?.walletBalance || 0).toLocaleString()}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleRefreshWallet}
                  disabled={isRefreshingWallet}
                  title={t('common.refresh')}
                  className="hidden sm:inline-block p-0.5 text-neutral-400 hover:text-[#0b7e74] transition cursor-pointer rounded-full"
                >
                  <RotateCw className={`h-3 w-3 ${isRefreshingWallet ? 'animate-spin text-[#0b7e74]' : ''}`} />
                </button>
              </div>
            )}

            {/* TIGHTENED CART BUTTON */}
            <button
              type="button"
              onClick={onCartOpen}
              aria-label={t('cart.title')}
              title={t('nav.openCart')}
              className="relative flex h-8 w-8 sm:h-9 sm:w-9 cursor-pointer items-center justify-center rounded-full text-neutral-600 transition hover:text-black hover:bg-black/5 active:scale-[0.95] dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10 shrink-0"
            >
              <ShoppingCart className="h-4 w-4 text-[#0b7e74]" />
              {count > 0 && (
                <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#0b7e74] px-1 text-[9px] font-black text-white shadow-sm">
                  {count}
                </span>
              )}
            </button>

            {/* LOGIN / PROFILE LINK */}
            <Link
              to={user ? '/account' : '/login'}
              title={user ? `${profile?.displayName || t('common.account')}` : t('common.login')}
              aria-label={user ? t('common.account') : t('common.login')}
              className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full text-neutral-600 transition hover:text-black hover:bg-black/5 active:scale-[0.95] dark:text-neutral-300 dark:hover:text-white dark:hover:bg-white/10 shrink-0"
            >
              <User className="h-4 w-4 text-[#0b7e74]" />
            </Link>
          </div>
        </div>
      </header>

      {/* PAGE CONTENT CONTAINER */}
      <main>{children}</main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-black/10 bg-white/95 px-2 py-2 shadow-lg backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95 md:hidden">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold transition ${isActive
              ? 'text-[#0b7e74] dark:text-[#67dccf]'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <Home className="h-5 w-5" />
          <span>{t('nav.home')}</span>
        </NavLink>

        <NavLink
          to="/store"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${isActive
              ? 'text-[#0b7e74] dark:text-[#67dccf]'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <ShoppingBag className="h-5 w-5" />
          <span>{t('nav.store')}</span>
        </NavLink>

        <NavLink
          to="/custom-order"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${isActive
              ? 'text-[#0b7e74] dark:text-[#67dccf]'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <Sparkles className="h-5 w-5" />
          <span>{t('customOrder.title').split(' ')[0] || 'Custom'}</span>
        </NavLink>

        <NavLink
          to="/wallet"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg px-2.5 py-1 text-[10px] font-bold transition ${isActive
              ? 'text-[#0b7e74] dark:text-[#67dccf]'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <Wallet className="h-5 w-5" />
          <span>{t('nav.wallet')}</span>
        </NavLink>

        <NavLink
          to={user ? '/account' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold transition ${isActive
              ? 'text-[#0b7e74] dark:text-[#67dccf]'
              : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <User className="h-5 w-5" />
          <span>{user ? t('nav.account') : t('nav.login')}</span>
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-lg px-3 py-1 text-[10px] font-bold transition ${isActive
                ? 'text-[#0b7e74] dark:text-[#67dccf]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`
            }
          >
            <ShieldCheck className="h-5 w-5" />
            <span>{t('nav.admin')}</span>
          </NavLink>
        )}
      </nav>

      {/* GLOBAL SEARCH OVERLAY MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-base font-black">{t('home.heroTitle')}</h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <GlobalSearch
              onSelect={() => setIsSearchOpen(false)}
              placeholder={t('store.searchPlaceholder')}
            />
          </div>
        </div>
      )}
    </div>
  )
}


