import { useState } from 'react'
import { Link } from 'react-router'
import { useCart } from '../../utils/useCart'
import { useCoupon } from '../../utils/couponContext'
import { formatCurrency } from '../../utils/format'
import { ProductImage } from '../common/ProductImage'
import { Tag, X } from 'lucide-react'

export function CartDrawer({ isOpen, onClose }) {
  const { items, removeFromCart, subtotal, updateQuantity } = useCart()
  const { appliedCoupon, couponDiscountMmk, applyCoupon, removeCoupon } = useCoupon()

  const [inputCode, setInputCode] = useState('')
  const [couponLoading, setCouponLoading] = useState(false)
  const [couponError, setCouponError] = useState('')

  const finalTotal = Math.max(0, subtotal - couponDiscountMmk)

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
      className={`fixed inset-0 z-50 transition ${
        isOpen ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
    >
      <button
        type="button"
        aria-label="Close cart overlay"
        onClick={onClose}
        className={`absolute inset-0 bg-black/35 transition-opacity ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <aside
        className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl transition-transform duration-300 dark:bg-neutral-950 dark:text-white ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-black/10 p-5 dark:border-white/10">
          <p className="text-lg font-black">Your Cart ({items.length})</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-sm font-bold hover:bg-neutral-100 dark:hover:bg-neutral-900 cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="grid h-full place-items-center text-center">
              <div>
                <p className="text-[#0fa697] font-bold">Your cart is empty</p>
                <p className="mt-1 text-sm text-neutral-500 dark:text-white/50">
                  Add items to get started
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div
                  key={item.cartItemId || item.id}
                  className="rounded-lg border border-black/10 bg-neutral-50 p-4 dark:border-white/10 dark:bg-neutral-900"
                >
                  <div className="flex gap-4">
                    <div
                      className={`relative grid size-16 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${item.gradient}`}
                    >
                      <ProductImage
                        image={item.image}
                        name={item.name}
                        className="h-full w-full object-cover"
                        fallbackClassName="text-lg font-black text-white"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{item.name}</p>
                      {item.variantName ? (
                        <p className="text-xs font-bold text-[#0b7e74]">
                          Option: {item.variantName}
                        </p>
                      ) : (
                        <p className="text-sm text-neutral-500 dark:text-white/50">
                          {item.platform} / {item.category}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <div className="flex items-center rounded-full border border-black/10 bg-white dark:border-white/10 dark:bg-neutral-950">
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId || item.id, item.quantity - 1)
                            }
                            className="px-2.5 py-1 text-xs font-bold"
                          >
                            -
                          </button>
                          <span className="px-2 text-xs font-bold">{item.quantity}</span>
                          <button
                            type="button"
                            onClick={() =>
                              updateQuantity(item.cartItemId || item.id, item.quantity + 1)
                            }
                            className="px-2.5 py-1 text-xs font-bold"
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.cartItemId || item.id)}
                          className="text-xs font-bold text-[#ff655b]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                    <div className="text-right font-black">
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
              <div className="flex items-center justify-between rounded-2xl bg-emerald-500/10 p-3 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  <span>Promo Code <strong>{appliedCoupon.code}</strong> (-{appliedCoupon.discountPercent}%)</span>
                </div>
                <button
                  type="button"
                  onClick={removeCoupon}
                  className="p-1 hover:bg-emerald-500/20 rounded-full cursor-pointer"
                  title="Remove Promo Code"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={handleApplyCoupon} className="space-y-1">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={inputCode}
                    onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                    placeholder="Enter Promo Code (e.g. SUMMER20)"
                    className="flex-1 rounded-xl border border-black/10 bg-white px-3.5 py-2 font-mono text-xs font-bold tracking-wider outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                  />
                  <button
                    type="submit"
                    disabled={couponLoading || !inputCode.trim()}
                    className="rounded-xl bg-[#0b7e74] px-4 py-2 text-xs font-black text-white transition hover:bg-[#096860] disabled:opacity-50 cursor-pointer"
                  >
                    {couponLoading ? 'Applying...' : 'Apply'}
                  </button>
                </div>
                {couponError && (
                  <p className="text-[11px] font-bold text-red-500">{couponError}</p>
                )}
              </form>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-white/50">Subtotal</span>
                <span className="font-bold">{formatCurrency(subtotal)}</span>
              </div>
              {appliedCoupon && couponDiscountMmk > 0 && (
                <div className="flex justify-between text-emerald-600 dark:text-emerald-400 font-bold">
                  <span>Coupon Discount ({appliedCoupon.code})</span>
                  <span>-{formatCurrency(couponDiscountMmk)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black border-t border-black/5 pt-2 dark:border-white/5">
                <span>Total Payable</span>
                <span>{formatCurrency(finalTotal)}</span>
              </div>
            </div>

            <Link
              to="/checkout"
              onClick={onClose}
              className="block rounded-full bg-gradient-to-r from-[#0fa697] to-[#ff655b] px-5 py-3 text-center font-black text-white shadow-lg transition hover:shadow-xl"
            >
              Checkout
            </Link>
          </div>
        )}
      </aside>
    </div>
  )
}
