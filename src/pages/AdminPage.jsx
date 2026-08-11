import { useState, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { PackageCheck, Tag, Percent } from 'lucide-react'
import { AdminOrdersPage } from './AdminOrdersPage'
import { AdminProductsPage } from './AdminProductsPage'
import { AdminDiscountsTab } from '../components/admin/AdminDiscountsTab'
import { useProducts } from '../utils/useProducts'


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

  const { exchangeRate, taxPercent, serviceFeePercent, triggerMarketRateSync, updateFees } = useProducts()
  const [syncingRate, setSyncingRate] = useState(false)
  const [editingFees, setEditingFees] = useState(false)
  const [inputTax, setInputTax] = useState(taxPercent || 0)
  const [inputFee, setInputFee] = useState(serviceFeePercent || 0)
  const [savingFees, setSavingFees] = useState(false)

  useEffect(() => {
    setInputTax(taxPercent || 0)
    setInputFee(serviceFeePercent || 0)
  }, [taxPercent, serviceFeePercent])

  async function handleManualSync() {
    setSyncingRate(true)
    try {
      await triggerMarketRateSync()
    } catch (err) {
      console.error(err)
    } finally {
      setSyncingRate(false)
    }
  }

  async function handleSaveFees(e) {
    e.preventDefault()
    setSavingFees(true)
    try {
      await updateFees({ taxPercent: Number(inputTax), serviceFeePercent: Number(inputFee) })
      setEditingFees(false)
    } catch (err) {
      alert(`Failed to update fees: ${err.message}`)
    } finally {
      setSavingFees(false)
    }
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

          {/* LIVE EXCHANGE RATE & FEE CONFIGURATION BADGES */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-bold text-neutral-600 dark:text-neutral-300">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0b7e74]/15 px-3 py-1 text-xs font-black text-[#0b7e74]">
              ⚡ Rate: 1 USD = {exchangeRate?.toLocaleString()} MMK
            </span>
            <button
              type="button"
              onClick={handleManualSync}
              disabled={syncingRate}
              className="cursor-pointer text-[11px] font-bold text-[#0b7e74] hover:underline disabled:opacity-50"
            >
              {syncingRate ? 'Syncing...' : 'Sync P2P Rate Now ↻'}
            </button>

            <span className="text-neutral-300">•</span>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/15 px-3 py-1 text-xs font-black text-indigo-600 dark:text-indigo-400">
              Tax: {taxPercent}% | Service Fee: {serviceFeePercent}%
            </span>
            <button
              type="button"
              onClick={() => setEditingFees(!editingFees)}
              className="cursor-pointer text-[11px] font-bold text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {editingFees ? 'Cancel' : 'Edit % Fees ⚙️'}
            </button>
          </div>

          {/* FEE EDIT POPUP INLINE FORM */}
          {editingFees && (
            <form onSubmit={handleSaveFees} className="mt-3 flex items-center gap-3 rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3">
              <div>
                <label className="block text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Tax (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inputTax}
                  onChange={(e) => setInputTax(e.target.value)}
                  className="mt-0.5 w-20 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-bold dark:border-white/10 dark:bg-neutral-900"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-indigo-600 dark:text-indigo-400">Service Fee (%)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={inputFee}
                  onChange={(e) => setInputFee(e.target.value)}
                  className="mt-0.5 w-20 rounded-lg border border-black/10 bg-white px-2 py-1 text-xs font-bold dark:border-white/10 dark:bg-neutral-900"
                />
              </div>

              <button
                type="submit"
                disabled={savingFees}
                className="mt-3 cursor-pointer rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingFees ? 'Saving...' : 'Save Fees'}
              </button>
            </form>
          )}
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
