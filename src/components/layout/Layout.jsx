import { useState, useEffect } from 'react'
import { Link, NavLink, useLocation } from 'react-router'
import { useCart } from '../../utils/useCart'
import { useAuth } from '../../utils/useAuth'
import { GlobalSearch } from '../product/GlobalSearch'
import { formatCurrency } from '../../utils/format'
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
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/store', label: 'Store' },
]

export function Layout({ children, onCartOpen }) {
  const { count } = useCart()
  const { isAdmin, profile, user, refreshProfile } = useAuth()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isRefreshingWallet, setIsRefreshingWallet] = useState(false)
  const location = useLocation()

  async function handleRefreshWallet(e) {
    if (e) e.preventDefault()
    setIsRefreshingWallet(true)
    if (refreshProfile) await refreshProfile()
    setTimeout(() => setIsRefreshingWallet(false), 500)
  }

  const visibleNavItems = [
    ...navItems,
    ...(user
      ? [
          { to: '/wallet', label: 'Wallet' },
          { to: '/orders', label: 'Orders' },
          { to: '/account', label: 'Account' },
        ]
      : []),
    ...(isAdmin ? [{ to: '/admin', label: 'Admin' }] : []),
  ]

  const activeIndex = Math.max(
    0,
    visibleNavItems.findIndex((item) =>
      item.to === '/'
        ? location.pathname === '/'
        : location.pathname.startsWith(item.to),
    ),
  )

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
    <div className="min-h-screen bg-[#f7fbfa] text-neutral-950 transition-colors dark:bg-neutral-950 dark:text-white pb-20 md:pb-0">
      {/* STICKY DESKTOP & MOBILE HEADER */}
      <header className="sticky top-0 z-30 px-3 py-3 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-2.5 rounded-full border border-black/10 bg-white/85 px-3 py-2 shadow-xl shadow-black/5 backdrop-blur-xl transition-colors dark:border-white/10 dark:bg-neutral-900/85 dark:shadow-black/30">
          {/* BRAND LOGO */}
          <Link to="/" className="flex items-center gap-2 pl-1">
            <span className="grid size-9 sm:size-10 place-items-center rounded-xl bg-gradient-to-br from-[#0fa697] to-[#ff655b] font-black text-white shadow-sm text-sm sm:text-base">
              T
            </span>
            <span className="text-base sm:text-lg font-black tracking-tight">
              Toodleoo
            </span>
          </Link>

          {/* MAIN PILL NAVIGATION BAR (DESKTOP ONLY) */}
          <nav
            className="relative hidden rounded-full border border-black/10 bg-neutral-100 p-1 text-sm font-medium dark:border-white/10 dark:bg-white/10 md:grid"
            style={{
              gridTemplateColumns: `repeat(${visibleNavItems.length}, minmax(0, 1fr))`,
              width: `${visibleNavItems.length * 92}px`,
            }}
          >
            <span
              className="absolute left-1 top-1 h-[calc(100%-8px)] rounded-full bg-neutral-950 shadow-md transition-all duration-300 ease-out dark:bg-white"
              style={{
                transform: `translateX(${activeIndex * 100}%)`,
                width: `calc((100% - 8px) / ${visibleNavItems.length})`,
              }}
            />
            {visibleNavItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `relative z-10 rounded-full px-4 py-2 text-center transition-colors duration-300 ${
                    isActive
                      ? 'text-white dark:text-neutral-950'
                      : 'text-neutral-600 hover:text-neutral-950 dark:text-white/60 dark:hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          {/* HEADER ACTION BUTTONS */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {/* SEARCH ICON BUTTON */}
            <button
              type="button"
              onClick={() => setIsSearchOpen(true)}
              aria-label="Search Store"
              title="Search store (Ctrl+K)"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition hover:bg-neutral-100 active:scale-[0.98] dark:border-white/10 dark:bg-white/10 dark:hover:bg-white/20"
            >
              <Search className="h-4 w-4 text-neutral-600 dark:text-neutral-300" />
            </button>

            {/* WALLET BALANCE & REFRESH ICON */}
            {user && (
              <div className="flex h-9 items-center gap-1.5 rounded-full border border-black/10 bg-white px-3 text-xs font-bold shadow-sm dark:border-white/10 dark:bg-white/10">
                <Link
                  to="/wallet"
                  className="flex items-center gap-1 text-neutral-900 dark:text-white hover:text-[#0b7e74] transition"
                  title="View Personal Wallet"
                >
                  <Wallet className="h-4 w-4 text-[#0b7e74]" />
                  <span className="font-mono text-xs font-black">
                    {Number(profile?.walletBalance || 0).toLocaleString()}
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={handleRefreshWallet}
                  disabled={isRefreshingWallet}
                  title="Refresh Wallet Balance"
                  className="p-0.5 text-neutral-400 hover:text-[#0b7e74] transition cursor-pointer rounded-full"
                >
                  <RotateCw className={`h-3 w-3 ${isRefreshingWallet ? 'animate-spin text-[#0b7e74]' : ''}`} />
                </button>
              </div>
            )}

            {/* CART BUTTON */}
            <button
              type="button"
              onClick={onCartOpen}
              aria-label="Shopping Cart"
              title="View Shopping Cart"
              className="relative flex h-9 items-center gap-1.5 cursor-pointer rounded-full border border-black/10 bg-white px-3 text-xs font-semibold shadow-sm transition hover:bg-neutral-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/10"
            >
              <ShoppingCart className="h-4 w-4 text-[#0b7e74]" />
              <span className="rounded-full bg-[#0b7e74] px-1.5 py-0.5 text-[10px] font-black text-white">
                {count}
              </span>
            </button>

            {/* LOGIN / PROFILE LINK (ICON ONLY) */}
            <Link
              to={user ? '/account' : '/login'}
              title={user ? profile?.displayName || 'Account' : 'Login'}
              aria-label={user ? 'Account' : 'Login'}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-black/10 bg-white shadow-sm transition hover:bg-neutral-50 active:scale-[0.98] dark:border-white/10 dark:bg-white/10"
            >
              <User className="h-4 w-4 text-[#0b7e74]" />
            </Link>


          </div>
        </div>
      </header>

      {/* PAGE CONTENT CONTAINER */}
      <main>{children}</main>

      {/* MOBILE BOTTOM NAVIGATION BAR (FIXED BOTTOM DOCK FOR MOBILE DEVICES) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around border-t border-black/10 bg-white/90 px-2 py-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900/95 md:hidden">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
              isActive
                ? 'text-[#0b7e74] dark:text-[#67dccf]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </NavLink>

        <NavLink
          to="/store"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
              isActive
                ? 'text-[#0b7e74] dark:text-[#67dccf]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <ShoppingBag className="h-5 w-5" />
          <span>Store</span>
        </NavLink>

        <NavLink
          to="/wallet"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
              isActive
                ? 'text-[#0b7e74] dark:text-[#67dccf]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <Wallet className="h-5 w-5" />
          <span>Wallet</span>
        </NavLink>

        <NavLink
          to="/orders"
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
              isActive
                ? 'text-[#0b7e74] dark:text-[#67dccf]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <Package className="h-5 w-5" />
          <span>Orders</span>
        </NavLink>

        <NavLink
          to={user ? '/account' : '/login'}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
              isActive
                ? 'text-[#0b7e74] dark:text-[#67dccf]'
                : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
            }`
          }
        >
          <User className="h-5 w-5" />
          <span>{user ? 'Account' : 'Login'}</span>
        </NavLink>

        {isAdmin && (
          <NavLink
            to="/admin"
            className={({ isActive }) =>
              `flex flex-col items-center gap-1 rounded-2xl px-3 py-1.5 text-[10px] font-bold transition ${
                isActive
                  ? 'text-[#0b7e74] dark:text-[#67dccf]'
                  : 'text-neutral-500 dark:text-neutral-400 hover:text-black dark:hover:text-white'
              }`
            }
          >
            <ShieldCheck className="h-5 w-5" />
            <span>Admin</span>
          </NavLink>
        )}
      </nav>

      {/* GLOBAL SEARCH OVERLAY MODAL */}
      {isSearchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-16 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between pb-3">
              <h3 className="text-base font-black">Search Toodleoo Store</h3>
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="cursor-pointer rounded-full p-1 text-xs font-bold text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                ✕
              </button>
            </div>
            <GlobalSearch
              onSelect={() => setIsSearchOpen(false)}
              placeholder="Search products, games, digital services..."
            />
          </div>
        </div>
      )}
    </div>
  )
}
