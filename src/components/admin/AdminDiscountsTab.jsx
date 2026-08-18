import { useEffect, useState } from 'react'
import {
  Tag,
  Plus,
  Trash2,
  Clock,
  Sparkles,
  Copy,
  Check,
  Globe,
  Layers,
  CheckSquare,
  X,
} from 'lucide-react'
import {
  createCoupon,
  deleteCoupon,
  subscribeCoupons,
  toggleCouponStatus,
} from '../../services/storeService'
import { useProducts } from '../../utils/useProducts'
import { formatCurrency } from '../../utils/format'
import { useTranslation } from '../../utils/useTranslation'

export function AdminDiscountsTab() {
  const { t } = useTranslation()
  const { products, categories } = useProducts()
  const [coupons, setCoupons] = useState([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [copiedCode, setCopiedCode] = useState('')
  const [feedback, setFeedback] = useState('')

  // Form State
  const [codeType, setCodeType] = useState('auto') // 'auto' | 'custom'
  const [code, setCode] = useState('')
  const [discountType, setDiscountType] = useState('global') // 'global' | 'type' | 'selection'
  const [discountPercent, setDiscountPercent] = useState(20)
  const [targetCategory, setTargetCategory] = useState('')
  const [selectedProductIds, setSelectedProductIds] = useState([])
  const [maxUses, setMaxUses] = useState('')
  const [expiresAt, setExpiresAt] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const unsubscribe = subscribeCoupons((data) => {
      setCoupons(data)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  function generateUniqueCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let part1 = ''
    let part2 = ''
    for (let i = 0; i < 4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length))
    for (let i = 0; i < 4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length))
    return `TD-${part1}-${part2}`
  }

  function handleOpenModal() {
    const autoCode = generateUniqueCode()
    setCodeType('auto')
    setCode(autoCode)
    setDiscountType('global')
    setDiscountPercent(20)
    setTargetCategory(categories[1] || '')
    setSelectedProductIds([])
    setMaxUses('')
    setExpiresAt('')
    setIsModalOpen(true)
  }

  function handleCopyCode(couponCode) {
    navigator.clipboard.writeText(couponCode)
    setCopiedCode(couponCode)
    setTimeout(() => setCopiedCode(''), 2000)
  }

  async function handleToggleStatus(coupon) {
    try {
      await toggleCouponStatus(coupon.id, !coupon.isActive)
      setFeedback(`Coupon ${coupon.code} updated.`)
    } catch (err) {
      alert(`Status update failed: ${err.message}`)
    }
  }

  async function handleDelete(couponId, couponCode) {
    if (!confirm(`Are you sure you want to delete coupon code "${couponCode}"?`)) return
    try {
      await deleteCoupon(couponId)
      setFeedback(`Coupon "${couponCode}" deleted successfully.`)
    } catch (err) {
      alert(`Deletion failed: ${err.message}`)
    }
  }

  function handleProductToggle(prodId) {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId],
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setSubmitting(true)
    try {
      let finalCode = code.trim().toUpperCase()
      if (!finalCode) {
        finalCode = generateUniqueCode()
      }

      await createCoupon({
        code: finalCode,
        discountPercent: Number(discountPercent),
        discountType,
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        maxUses: maxUses ? Number(maxUses) : null,
        productIds: discountType === 'selection' ? selectedProductIds : [],
        targetValue: discountType === 'type' ? targetCategory : '',
      })

      setFeedback(`Coupon "${finalCode}" created successfully!`)
      setIsModalOpen(false)
    } catch (err) {
      alert(`Failed to create coupon: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="space-y-6">
      {/* HEADER TITLE & CREATE BUTTON */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold text-[#0b7e74]">{t('admin.subtitle')}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black">{t('admin.couponsTab.title')}</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {t('admin.couponsTab.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenModal}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0b7e74] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#096860]"
        >
          <Plus className="h-4 w-4" />
          <span>{t('admin.couponsTab.createCoupon')}</span>
        </button>
      </div>

      {feedback && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
          <span>{feedback}</span>
          <button type="button" onClick={() => setFeedback('')} className="cursor-pointer p-1">
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* COUPONS TABLE */}
      <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        {loading ? (
          <div className="p-8 text-center text-xs font-bold text-neutral-500">{t('common.loading')}</div>
        ) : coupons.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            <Tag className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-2 text-sm font-bold">{t('admin.couponsTab.noCoupons')}</p>
            <p className="mt-1 text-xs">{t('admin.couponsTab.createHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:bg-neutral-800/50">
                <tr>
                  <th className="p-2.5">{t('admin.couponsTab.couponCode')}</th>
                  <th className="p-2.5">{t('admin.couponsTab.scope')}</th>
                  <th className="p-2.5">{t('admin.couponsTab.discount')}</th>
                  <th className="p-2.5">{t('admin.couponsTab.usageLimit')}</th>
                  <th className="p-2.5">{t('admin.couponsTab.expiresOn')}</th>
                  <th className="p-2.5">{t('admin.couponsTab.status')}</th>
                  <th className="p-2.5 text-right">{t('admin.couponsTab.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {coupons.map((c) => {
                  const isExpired = c.expiresAt && new Date(c.expiresAt) <= new Date()
                  const isMaxedOut = c.maxUses !== null && c.currentUses >= c.maxUses

                  return (
                    <tr
                      key={c.id}
                      className="transition hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="p-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-black text-xs text-[#0b7e74] bg-[#0b7e74]/10 px-2 py-0.5 rounded-md">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(c.code)}
                            title={t('admin.couponsTab.copy')}
                            className="p-1 text-neutral-400 hover:text-black dark:hover:text-white transition cursor-pointer"
                          >
                            {copiedCode === c.code ? (
                              <Check className="h-3.5 w-3.5 text-emerald-500" />
                            ) : (
                              <Copy className="h-3.5 w-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      <td className="p-2.5 font-bold">
                        {c.discountType === 'global' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            <Globe className="h-3 w-3" /> {t('admin.couponsTab.globalAll')}
                          </span>
                        )}
                        {c.discountType === 'type' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            <Layers className="h-3 w-3" /> {t('admin.couponsTab.categoryType', { category: c.targetValue || 'Category' })}
                          </span>
                        )}
                        {c.discountType === 'selection' && (
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-600 dark:text-amber-400">
                            <CheckSquare className="h-3 w-3" /> {t('admin.couponsTab.specificProducts', { count: c.productIds?.length || 0 })}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 font-bold text-emerald-600 dark:text-emerald-400">
                        {c.discountPercent}% OFF
                      </td>

                      <td className="p-2.5 font-bold">
                        {c.maxUses === null ? (
                          <span className="text-neutral-500">{c.currentUses} / {t('admin.couponsTab.unlimited')}</span>
                        ) : (
                          <span className={isMaxedOut ? 'text-red-500 font-bold' : 'text-neutral-700 dark:text-neutral-300'}>
                            {t('admin.couponsTab.usesCount', { used: c.currentUses, max: c.maxUses })}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5">
                        {c.expiresAt ? (
                          <span className={`inline-flex items-center gap-1 font-medium ${isExpired ? 'text-red-500 font-bold' : 'text-neutral-600 dark:text-neutral-400'}`}>
                            <Clock className="h-3 w-3" />
                            {new Date(c.expiresAt).toLocaleDateString()}
                          </span>
                        ) : (
                          <span className="text-neutral-400">{t('admin.couponsTab.neverExpires')}</span>
                        )}
                      </td>

                      <td className="p-2.5">
                        <button
                          type="button"
                          onClick={() => handleToggleStatus(c)}
                          className={`inline-flex cursor-pointer items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold transition ${
                            c.isActive && !isExpired && !isMaxedOut
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                              : 'bg-neutral-200 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              c.isActive && !isExpired && !isMaxedOut ? 'bg-emerald-500' : 'bg-neutral-400'
                            }`}
                          />
                          {c.isActive ? (isExpired ? t('warranty.expired') : isMaxedOut ? 'Limit Reached' : t('admin.couponsTab.active')) : t('admin.couponsTab.inactive')}
                        </button>
                      </td>

                      <td className="p-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleDelete(c.id, c.code)}
                          className="p-1.5 text-red-500 transition hover:bg-red-500/10 rounded-lg cursor-pointer"
                          title="Delete Coupon"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CREATE COUPON MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-xl border border-black/10 bg-white p-5 sm:p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-black/10 pb-3.5 dark:border-white/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-[#0b7e74]" />
                <h2 className="text-lg sm:text-xl font-black">{t('admin.couponsTab.createModalTitle')}</h2>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-5 space-y-4">
              {/* CODE GENERATION TYPE */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  {t('admin.couponsTab.codeType')}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setCodeType('auto')
                      setCode(generateUniqueCode())
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-bold transition cursor-pointer ${
                      codeType === 'auto'
                        ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74]'
                        : 'border-black/10 bg-neutral-50 text-neutral-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>{t('admin.couponsTab.autoGenerated')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setCodeType('custom')
                      setCode('')
                    }}
                    className={`flex items-center justify-center gap-2 rounded-lg border p-2.5 text-xs font-bold transition cursor-pointer ${
                      codeType === 'custom'
                        ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74]'
                        : 'border-black/10 bg-neutral-50 text-neutral-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    <Tag className="h-4 w-4" />
                    <span>{t('admin.couponsTab.customCode')}</span>
                  </button>
                </div>
              </div>

              {/* CODE DISPLAY / INPUT */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                  {t('admin.couponsTab.couponCode')}
                </label>
                <div className="relative mt-1">
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. SUMMER20 or TD-9X82-K3L9"
                    className="w-full rounded-lg border border-black/10 bg-white px-3.5 py-2.5 font-mono text-xs font-bold tracking-wider outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                    required
                  />
                  {codeType === 'auto' && (
                    <button
                      type="button"
                      onClick={() => setCode(generateUniqueCode())}
                      className="absolute right-2.5 top-2 rounded-md bg-[#0b7e74]/10 px-2.5 py-1 text-[11px] font-bold text-[#0b7e74] hover:bg-[#0b7e74] hover:text-white transition cursor-pointer"
                    >
                      Re-generate
                    </button>
                  )}
                </div>
              </div>

              {/* DISCOUNT SCOPE */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                  {t('admin.couponsTab.applicableScope')}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setDiscountType('global')}
                    className={`rounded-lg border p-2 text-center text-xs font-bold transition cursor-pointer ${
                      discountType === 'global'
                        ? 'border-[#0b7e74] bg-[#0b7e74] text-white'
                        : 'border-black/10 bg-white text-neutral-700 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    Global (All)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('type')}
                    className={`rounded-lg border p-2 text-center text-xs font-bold transition cursor-pointer ${
                      discountType === 'type'
                        ? 'border-[#0b7e74] bg-[#0b7e74] text-white'
                        : 'border-black/10 bg-white text-neutral-700 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    Type / Tag
                  </button>
                  <button
                    type="button"
                    onClick={() => setDiscountType('selection')}
                    className={`rounded-lg border p-2 text-center text-xs font-bold transition cursor-pointer ${
                      discountType === 'selection'
                        ? 'border-[#0b7e74] bg-[#0b7e74] text-white'
                        : 'border-black/10 bg-white text-neutral-700 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                    }`}
                  >
                    Selection
                  </button>
                </div>
              </div>

              {/* SCOPE DETAILS INPUT */}
              {discountType === 'type' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    Target Category / Tag Name
                  </label>
                  <select
                    value={targetCategory}
                    onChange={(e) => setTargetCategory(e.target.value)}
                    className="mt-1 w-full cursor-pointer rounded-lg border border-black/10 bg-white p-2.5 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                  >
                    {categories.filter((c) => c !== 'All').map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {discountType === 'selection' && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-1.5">
                    Select Specific Products:
                  </label>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-lg border border-black/10 bg-neutral-50 p-2.5 dark:border-white/10 dark:bg-neutral-950">
                    {products.map((p) => {
                      const checked = selectedProductIds.includes(p.id)
                      return (
                        <label
                          key={p.id}
                          className="flex cursor-pointer items-center justify-between gap-2 rounded-md bg-white p-2 text-xs font-bold shadow-sm transition hover:bg-neutral-100 dark:bg-neutral-900 dark:hover:bg-neutral-800"
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => handleProductToggle(p.id)}
                              className="h-4 w-4 accent-[#0b7e74] rounded"
                            />
                            <span>{p.name}</span>
                          </div>
                          <span className="text-[10px] text-neutral-400">{formatCurrency(p.priceMmk)}</span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* DISCOUNT PERCENTAGE */}
              <div>
                <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
                  <span>{t('admin.couponsTab.discountPercent')}</span>
                  <span className="font-bold text-[#0b7e74] text-sm">{discountPercent}% OFF</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={discountPercent}
                  onChange={(e) => setDiscountPercent(Number(e.target.value))}
                  className="mt-1.5 w-full accent-[#0b7e74]"
                />
              </div>

              {/* USAGE LIMIT & EXPIRATION */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {t('admin.couponsTab.maxRedemptions')}
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    placeholder="e.g. 100"
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2.5 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                    {t('admin.couponsTab.expirationDate')}
                  </label>
                  <input
                    type="date"
                    value={expiresAt}
                    onChange={(e) => setExpiresAt(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-black/10 bg-white p-2.5 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                  />
                </div>
              </div>

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full cursor-pointer rounded-lg bg-[#0b7e74] py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#096860] disabled:opacity-50"
                >
                  {submitting ? '...' : t('admin.couponsTab.submitCreate')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  )
}
