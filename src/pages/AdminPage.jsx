import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { PackageCheck, Tag, Percent } from 'lucide-react'
import { AdminOrdersPage } from './AdminOrdersPage'
import { AdminProductsPage } from './AdminProductsPage'
import { AdminDiscountsTab } from '../components/admin/AdminDiscountsTab'

export function AdminPage({ defaultTab }) {
  const location = useLocation()
  const navigate = useNavigate()

  const getInitialTab = () => {
    if (defaultTab) return defaultTab
    if (location.pathname.includes('/admin/products')) return 'products'
    if (location.pathname.includes('/admin/discounts')) return 'discounts'
    return 'orders'
  }

  const [activeTab, setActiveTab] = useState(getInitialTab)

  useEffect(() => {
    if (location.pathname.includes('/admin/products')) setActiveTab('products')
    else if (location.pathname.includes('/admin/discounts')) setActiveTab('discounts')
    else if (location.pathname.includes('/admin/orders')) setActiveTab('orders')
  }, [location.pathname])

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    if (tabId === 'orders') navigate('/admin/orders', { replace: true })
    else if (tabId === 'products') navigate('/admin/products', { replace: true })
    else if (tabId === 'discounts') navigate('/admin/discounts', { replace: true })
  }

  return (
    <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
      {/* ADMIN HUB TOP NAVIGATION HEADER */}
      <div className="flex flex-col gap-4 rounded-3xl border border-black/10 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-[#0b7e74]">
            Store Operations & Admin Hub
          </p>
          <h1 className="mt-1 text-3xl font-black">Store Administration</h1>
        </div>

        {/* SUB-TABS SELECTOR */}
        <div className="flex items-center gap-1.5 overflow-x-auto rounded-2xl border border-black/10 bg-neutral-100 p-1.5 dark:border-white/10 dark:bg-neutral-800">

          <button
            type="button"
            onClick={() => handleTabChange('orders')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${activeTab === 'orders'
                ? 'bg-white text-black shadow-md dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60'
              }`}
          >
            <PackageCheck className="h-4 w-4 text-[#0b7e74]" />
            <span>Orders & Payments</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('products')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${activeTab === 'products'
                ? 'bg-[#0b7e74] text-white shadow-md'
                : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60'
              }`}
          >
            <Tag className="h-4 w-4 text-amber-500" />
            <span>Products & Inventory</span>
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('discounts')}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black transition ${activeTab === 'discounts'
                ? 'bg-white text-black shadow-md dark:bg-neutral-900 dark:text-white'
                : 'text-neutral-600 hover:bg-neutral-200/60 dark:text-neutral-400 dark:hover:bg-neutral-700/60'
              }`}
          >
            <Percent className="h-4 w-4 text-emerald-500" />
            <span>Coupons & Promos</span>
          </button>
        </div>
      </div>

      {/* ACTIVE SUB-TAB CONTENT PANEL */}
      <div>
        {activeTab === 'orders' && <AdminOrdersPage />}
        {activeTab === 'products' && <AdminProductsPage />}
        {activeTab === 'discounts' && <AdminDiscountsTab />}
      </div>
    </section>
  )
}
