import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import { useCart } from '../../utils/useCart'
import { useCoupon } from '../../utils/couponContext'
import { useAuth } from '../../utils/useAuth'
import { useTranslation } from '../../utils/useTranslation'
import { formatCurrency } from '../../utils/format'
import { ProductImage } from '../common/ProductImage'
import { Tag, X, Sparkles } from 'lucide-react'
import { getUserSubscription } from '../../utils/subscriptionPlans'

export function CartDrawer({ isOpen, onClose }) {
  const { items, removeFromCart, subtotal, updateQuantity } = useCart()
  const { appliedCoupon, couponDiscountMmk, applyCoupon, removeCoupon } = useCoupon()
  const { profile } = useAuth()
  const { t } = useTranslation()

  const subData = useMemo(() => getUserSubscription(profile), [profile])
  const memberDiscountPercent = subData.plan.memberDiscountPercent || 0
  const memberDiscountMmk = memberDiscountPercent > 0 ? Math.round((subtotal * memberDiscountPercent) / 100) : 0

  const [inputCode, setInputCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  const finalTotal = Math.max(0, subtotal - couponDiscountMmk - memberDiscountMmk)

  async function handleApplyCoupon(e) {
    e.preventDefault()
    setCouponError('')
    setCouponLoading(true)
    const res = await applyCoupon(inputCode, items)
    setCouponLoading(false)
    if (!res.success) {
      setCouponError(res.message)
    } else {
      setInputCode('')
    }
  }

  return (
    <div
      className={`fixed inset-0 z-50 transition ${isOpen ? 'pointer-events-auto' : 'pointer-events-none'
        }`}
    >
      <button
        type="button"
        aria-label="Close cart overlay"
        onClick={onClose}
        className={`absolute inset-0 bg-black/35 transition-opacity ${isOpen ? 'opacity-100' : 'opacity-0'
          }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-neutral-950 dark:text-white ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        <div className="flex items-center justify-between border-b border-black/10 p-5 dark:border-white/10">
          <p className="text-base font-black">{t('cart.title')} ({items.length})</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
            title="Close cart"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-[#0fa697] font-bold text-sm">{t('cart.emptyTitle')}</p>
                <p className="mt-1 text-xs text-neutral-500 dark:text-white/50">
                  {t('cart.emptyDesc')}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.cartItemId || item.id}
                  className="rounded-lg border border-black/10 bg-neutral-50 p-3.5 dark:border-white/10 dark:bg-neutral-900"
                >
                  <div className="flex gap-3">
                    <div
                      className={`relative grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${item.gradient}`}
                    >
                      <ProductImage
                        image={item.image}
                        name={item.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="text-base font-black text-white"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs leading-tight text-black dark:text-white truncate">{item.name}</p>
                      {item.variantName ? (
                        <p className="text-[11px] font-semibold text-[#0b7e74] mt-0.5">
                          {t('product.duration')}: {item.variantName}
                        </p>
                      ) : (
                        <p className="text-[10px] text-neutral-500 dark:text-white/50 mt-0.5">
                          {item.tag || 'Digital'} • {item.type || 'Key'}
                        </p>
                      )}
                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex items-center rounded-lg border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-950">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId || item.id, item.quantity - 1)
                            }
                            className="px-2 py-0.5 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold font-mono">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId || item.id, item.quantity + 1)
                            }
                            className="px-2 py-0.5 text-xs font-bold hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartItemId || item.id)}
                          className="text-[11px] font-semibold text-rose-500 hover:underline cursor-pointer"
                        >
                          {t('cart.remove')}
                        </button>
                      </div>
                    </div>
                    <div className="text-right font-black font-mono text-xs">
                      {formatCurrency((item.priceMmk || item.price) * item.quantity)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-black/10 p-5 space-y-4 dark:border-white/10">
            {appliedCoupon ? (
              <div className="flex items-center justify-between rounded-lg bg-emerald-500/10 p-2.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  <span>Promo <strong>{appliedCoupon.code}</strong> (-{appliedCoupon.discountPercent}%)</span>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="p-1 hover:bg-emerald-500/20 rounded-md cursor-pointer"
                  title="Remove Promo Code"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder={t('checkout.promoCode')}
                    className="flex-1 rounded-lg border border-black/10 bg-white px-3 py-2 font-mono text-xs font-semibold tracking-wider outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !inputCode.trim()}
                    className="rounded-lg bg-[#0b7e74] px-3.5 py-2 text-xs font-bold text-white transition hover:bg-[#096860] disabled:opacity-50 cursor-pointer"
                  >
                    {couponLoading ? t('common.loading') : t('checkout.applyPromo')}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] font-bold text-red-500">{couponError}</p>
                )}
              </form>
            )}

            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-white/50">{t('cart.subtotal')}</span>
                <span className="font-bold font-mono">{formatCurrency(subtotal)}</span>
              </div>
              {appliedCoupon && couponDiscountMmk > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>Coupon ({appliedCoupon.code})</span>
                  <span className="font-mono">-{formatCurrency(couponDiscountMmk)}</span>
                </div>
              )}
              {memberDiscountMmk > 0 && (
                <div className="flex justify-between text-purple-600 dark:text-purple-400 font-semibold">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    VIP ({subData.plan.name} - {memberDiscountPercent}%)
                  </span>
                  <span className="font-mono">-{formatCurrency(memberDiscountMmk)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black border-t border-black/5 pt-2 dark:border-white/5">
                <span>{t('cart.total')}</span>
                <span className="font-mono text-[#0b7e74] dark:text-[#67dccf]">{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <Link
              to="/checkout"
              onClick={onClose}
              className="block rounded-lg bg-gradient-to-r from-[#0fa697] to-[#ff655b] px-5 py-3 text-center text-xs font-bold text-white shadow-md transition hover:opacity-90 active:scale-[0.99]"
            >
              {t('cart.checkout')}
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}

