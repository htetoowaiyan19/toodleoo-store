import { useState, useEffect, useMemo } from 'react'
import { Link, useNavigate } from 'react-router'
import { X, ShoppingCart, Zap, Check, ArrowRight, ShieldCheck, Star, Tag, Key, Globe } from 'lucide-react'
import { ProductImage } from '../common/ProductImage'
import { getProductStatusDetails } from '../../utils/productStatus'
import { useCart } from '../../utils/useCart'
import { useAuth } from '../../utils/useAuth'
import { useTranslation } from '../../utils/useTranslation'
import { formatNumber } from '../../utils/format'
import { getUserSubscription } from '../../utils/subscriptionPlans'
import { calculateItemWarranty } from '../../utils/warrantyUtils'

export function ProductQuickViewModal({ product, isOpen, onClose }) {
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { profile } = useAuth()
  const { t } = useTranslation()

  const itemsList = Array.isArray(product?.items) ? product.items : []
  const isGroup = product?.productType === 'group' || itemsList.length > 1

  const [selectedVariantIndex, setSelectedVariantIndex] = useState(0)
  const [quantity, setQuantity] = useState(1)
  const [addedAnimation, setAddedAnimation] = useState(false)

  const subData = useMemo(() => getUserSubscription(profile), [profile])

  // Reset selected variant and quantity when product changes
  useEffect(() => {
    if (product) {
      const firstInStockIdx = isGroup
        ? itemsList.findIndex((i) => i.status === 'instock' && i.stock > 0)
        : 0
      setSelectedVariantIndex(firstInStockIdx >= 0 ? firstInStockIdx : 0)
      setQuantity(1)
      setAddedAnimation(false)
    }
  }, [product, isGroup, itemsList])

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && isOpen) {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  const activeItem = isGroup ? itemsList[selectedVariantIndex] || itemsList[0] : itemsList[0] || null

  const warrantyInfo = useMemo(() => {
    return calculateItemWarranty({
      item: activeItem || product,
      userTier: subData.tier,
    })
  }, [activeItem, product, subData.tier])

  if (!isOpen || !product) return null

  const statusDetails = getProductStatusDetails(
    activeItem ? activeItem.status : product.status,
    activeItem ? activeItem.stock : product.stock,
  )
  const isAvailable = statusDetails.isAvailable

  const currentPriceMmk = activeItem
    ? activeItem.priceMmk || activeItem.price || product.priceMmk || 0
    : product.priceMmk || product.price || 0

  function handleAddToCart() {
    if (!isAvailable) return
    addToCart(product, quantity, activeItem)
    setAddedAnimation(true)
    setTimeout(() => setAddedAnimation(false), 1800)
  }

  function handleBuyNow() {
    if (!isAvailable) return
    onClose()
    navigate('/checkout', {
      state: {
        directItem: {
          product,
          quantity,
          selectedVariant: activeItem,
        },
      },
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 backdrop-blur-md bg-black/60 transition-opacity">
      <div
        className="relative w-full max-w-3xl overflow-hidden rounded-xl border border-black/10 bg-white shadow-2xl transition-all dark:border-white/10 dark:bg-neutral-900 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* CLOSE BUTTON */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3.5 top-3.5 z-20 grid size-8 place-items-center rounded-lg bg-black/10 text-neutral-600 transition hover:bg-black/20 hover:text-black dark:bg-white/10 dark:text-neutral-300 dark:hover:bg-white/20 dark:hover:text-white cursor-pointer"
          title="Close (Esc)"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="grid grid-cols-1 md:grid-cols-2 max-h-[85vh] overflow-y-auto">
          {/* PRODUCT IMAGE HERO BANNER */}
          <div
            className={`relative flex min-h-[240px] md:min-h-full items-center justify-center overflow-hidden bg-gradient-to-br ${product.gradient || 'from-[#0fa697] to-[#ff655b]'}`}
          >
            <ProductImage
              image={product.image}
              name={product.name}
              className="h-full w-full object-cover"
              fallbackClassName="text-7xl font-black text-white drop-shadow-md"
            />

            {/* OVERLAY BADGES */}
            <div className="absolute left-3 top-3 flex flex-col gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-bold shadow-sm backdrop-blur-md ${statusDetails.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dotClass}`} />
                {product.status === 'pre-order' ? t('product.preOrder') : isAvailable ? t('product.inStock') : t('product.outOfStock')}
              </span>

              {product.badge && (
                <span className="self-start rounded-md bg-black/70 px-2 py-0.5 text-[10px] font-bold text-white backdrop-blur-sm">
                  {product.badge}
                </span>
              )}
            </div>

            {/* TAG & REGION OVERLAY */}
            <div className="absolute bottom-3 left-3 flex gap-1.5">
              <span className="inline-flex items-center gap-1 rounded-md bg-black/60 px-2 py-0.5 text-[11px] font-medium text-white backdrop-blur-sm">
                <Tag className="h-3 w-3" /> {product.tag || 'Digital'}
              </span>
              <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 text-[11px] font-medium text-neutral-900 backdrop-blur-sm dark:bg-neutral-800 dark:text-white">
                <Globe className="h-3 w-3" /> {product.region || 'Global'}
              </span>
            </div>
          </div>

          {/* PRODUCT DETAILS CONTENT */}
          <div className="flex flex-col justify-between p-5 sm:p-6 space-y-4">
            <div className="space-y-3">
              {/* STATUS & REVIEWS HEADER */}
              <div className="flex items-center justify-between gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold ${statusDetails.badgeClass}`}
                >
                  <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dotClass}`} />
                  {product.status === 'pre-order' ? t('product.preOrder') : isAvailable ? t('product.inStock') : t('product.outOfStock')}
                </span>

                <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  <span>{product.rating || 5.0}</span>
                  <span className="text-neutral-400 font-normal">({product.reviews || 12} reviews)</span>
                </div>
              </div>

              {/* TITLE */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-neutral-950 dark:text-white leading-tight">
                  {product.name}
                </h2>
              </div>

              {/* STRUCTURED PRODUCT SPECIFICATIONS */}
              <div className="rounded-lg border border-black/10 bg-neutral-50/80 p-3 dark:border-white/10 dark:bg-neutral-900/60">
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">{t('product.category')}</span>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">{product.tag || 'Digital'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">{t('product.type')}</span>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">{product.type || 'Key'}</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">{t('product.region')}</span>
                    <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-0.5">{product.region || 'Global'}</p>
                  </div>

                  {warrantyInfo?.hasWarranty && (
                    <div className="col-span-3 border-t border-black/5 pt-2 mt-0.5 dark:border-white/5 flex items-center justify-between text-xs">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t('product.warranty')}</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                        <ShieldCheck className="h-3.5 w-3.5" />
                        <span>Service+ {warrantyInfo.totalMonths}M Protection</span>
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* DESCRIPTION */}
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed line-clamp-3">
                {product.description || 'Premium digital product with fast fulfillment and instant support.'}
              </p>

              {/* VARIANT OPTIONS (IF GROUP PRODUCT) */}
              {isGroup && itemsList.length > 1 && (
                <div className="space-y-1.5 pt-1 border-t border-black/5 dark:border-white/5">
                  <label className="text-xs font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
                    {t('product.selectOption')}:
                  </label>
                  <div className="grid grid-cols-1 gap-1.5 max-h-36 overflow-y-auto pr-1">
                    {itemsList.map((item, idx) => {
                      const isSelected = idx === selectedVariantIndex
                      const itemInStock = item.status === 'instock' && item.stock > 0
                      const itemPreorder = item.status === 'pre-order' || item.status === 'preorder'

                      return (
                        <button
                          key={item.id || idx}
                          type="button"
                          onClick={() => setSelectedVariantIndex(idx)}
                          className={`flex items-center justify-between rounded-lg px-3 py-2 text-xs font-semibold transition border cursor-pointer ${
                            isSelected
                              ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74] dark:border-[#67dccf] dark:text-[#67dccf]'
                              : 'border-black/10 bg-neutral-50 text-neutral-700 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                          }`}
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span
                              className={`h-2 w-2 rounded-full shrink-0 ${
                                itemInStock ? 'bg-emerald-500' : itemPreorder ? 'bg-amber-500' : 'bg-rose-500'
                              }`}
                            />
                            <span className="truncate">{item.name}</span>
                          </div>
                          <span className="font-mono font-bold shrink-0 ml-2">
                            {formatNumber(item.priceMmk || item.price)} {t('common.ks')}
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* QUANTITY PICKER */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-xs font-bold text-neutral-500">{t('product.duration')}:</span>
                <div className="flex items-center rounded-lg border border-black/10 bg-neutral-50 dark:border-white/10 dark:bg-neutral-800 p-0.5">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="h-6.5 w-6.5 rounded-md text-xs font-bold transition hover:bg-neutral-200 dark:hover:bg-neutral-700 disabled:opacity-40 cursor-pointer"
                  >
                    -
                  </button>
                  <span className="w-8 text-center text-xs font-bold font-mono">{quantity}</span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="h-6.5 w-6.5 rounded-md text-xs font-bold transition hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer"
                  >
                    +
                  </button>
                </div>

                <span className="text-[11px] font-medium text-neutral-400">
                  {statusDetails.stockLabel || `${activeItem?.stock || product.stock || 0} in stock`}
                </span>
              </div>
            </div>

            {/* PRICE & ACTION BUTTONS */}
            <div className="space-y-2.5 pt-3 border-t border-black/5 dark:border-white/5">
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('product.totalPrice')}
                </span>
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl font-black font-mono text-neutral-950 dark:text-white">
                    {formatNumber(currentPriceMmk)}
                  </span>
                  <span className="text-xs font-bold text-neutral-500">{t('common.ks')}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={handleBuyNow}
                  className="flex-1 cursor-pointer rounded-lg bg-[#0b7e74] py-2.5 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#09665e] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {product.status === 'pre-order' ? t('product.preOrder') : t('product.buyNow')}
                </button>

                <button
                  type="button"
                  disabled={!isAvailable}
                  onClick={handleAddToCart}
                  className={`cursor-pointer rounded-lg px-4 py-2.5 text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 ${
                    addedAnimation
                      ? 'bg-emerald-600 text-white'
                      : 'border border-black/10 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700'
                  }`}
                >
                  {addedAnimation ? (
                    <>
                      <Check className="h-4 w-4" /> Added!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-4 w-4" /> + Cart
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-0.5">
                <Link
                  to={`/product/${product.slug}`}
                  onClick={onClose}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-[#0b7e74] hover:underline"
                >
                  <span>{t('product.quickView')} →</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

