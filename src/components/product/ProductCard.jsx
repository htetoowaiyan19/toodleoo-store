import { useState } from 'react'
import { Link, useNavigate } from 'react-router'
import { Eye, ShoppingCart, Check, Zap, ShieldCheck } from 'lucide-react'
import { useCart } from '../../utils/useCart'
import { useProducts } from '../../utils/useProducts'
import { useTranslation } from '../../utils/useTranslation'
import { formatNumber } from '../../utils/format'
import { getProductStatusDetails } from '../../utils/productStatus'
import { ProductImage } from '../common/ProductImage'
import { ProductQuickViewModal } from './ProductQuickViewModal'

export function ProductCard({ product, onQuickView }) {
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const { formatCurrency, formatPriceRange } = useProducts()
  const { t } = useTranslation()
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false)
  const [justAdded, setJustAdded] = useState(false)

  const itemsList = Array.isArray(product.items) ? product.items : []
  const isGroup = product.productType === 'group' || itemsList.length > 1

  let minPriceMmk = product.priceMmk || product.price || 0
  let maxPriceMmk = product.priceMmk || product.price || 0

  if (isGroup && itemsList.length > 0) {
    const prices = itemsList.map((i) => Number(i.priceMmk || i.price || 0))
    minPriceMmk = Math.min(...prices)
    maxPriceMmk = Math.max(...prices)
  }

  const isRange = isGroup && minPriceMmk < maxPriceMmk

  // Select lowest price in-stock item for default click
  const defaultItem = isGroup
    ? itemsList.find((i) => i.status === 'instock' && i.stock > 0) || itemsList[0]
    : itemsList[0] || null

  const statusDetails = getProductStatusDetails(
    defaultItem ? defaultItem.status : product.status,
    defaultItem ? defaultItem.stock : product.stock,
  )
  const isAvailable = statusDetails.isAvailable

  function handleBuyNow(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!isAvailable) return
    navigate('/checkout', {
      state: {
        directItem: {
          product,
          quantity: 1,
          selectedVariant: defaultItem,
        },
      },
    })
  }

  function handleAddToCart(e) {
    e.preventDefault()
    e.stopPropagation()
    if (!isAvailable) return
    addToCart(product, 1, defaultItem)
    setJustAdded(true)
    setTimeout(() => setJustAdded(false), 1500)
  }

  function handleOpenQuickView(e) {
    e.preventDefault()
    e.stopPropagation()
    if (onQuickView) {
      onQuickView(product)
    } else {
      setIsQuickViewOpen(true)
    }
  }

  return (
    <>
      <article className="group relative flex flex-col justify-between overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-md hover:border-black/20 dark:border-white/10 dark:bg-neutral-900 dark:hover:border-white/20">
        <div>
          {/* IMAGE BANNER CONTAINER */}
          <div className="relative aspect-[16/10] overflow-hidden bg-neutral-100 dark:bg-neutral-800">
            <Link to={`/product/${product.slug}`} className="block h-full w-full">
              <div
                className={`relative flex h-full w-full items-center justify-center overflow-hidden bg-gradient-to-br ${product.gradient || 'from-[#0fa697] to-[#ff655b]'}`}
              >
                <ProductImage
                  image={product.image}
                  name={product.name}
                  className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  fallbackClassName="text-3xl sm:text-4xl font-black text-white drop-shadow-sm"
                />
              </div>
            </Link>

            {/* FLOATING STATUS BADGE (TOP-LEFT) */}
            <div className="absolute left-2.5 top-2.5 z-10 flex flex-col gap-1 pointer-events-none">
              <span
                className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold shadow-sm backdrop-blur-md ${statusDetails.badgeClass}`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dotClass}`} />
                {product.status === 'pre-order' ? t('product.preOrder') : isAvailable ? t('product.inStock') : t('product.outOfStock')}
              </span>
            </div>

            {/* QUICK VIEW BUTTON (TOP-RIGHT ON HOVER) */}
            <button
              type="button"
              onClick={handleOpenQuickView}
              className="absolute right-2.5 top-2.5 z-10 grid size-7.5 place-items-center rounded-lg bg-black/60 text-white shadow-md backdrop-blur-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-105 hover:bg-[#0b7e74] cursor-pointer"
              title={t('product.quickView')}
              aria-label={t('product.quickView')}
            >
              <Eye className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* CARD BODY CONTENT */}
          <div className="p-3.5 sm:p-4 space-y-2.5">
            {/* TITLE */}
            <Link
              to={`/product/${product.slug}`}
              className="block text-sm font-bold text-neutral-900 transition-colors line-clamp-1 group-hover:text-[#0b7e74] dark:text-white dark:group-hover:text-[#67dccf]"
              title={product.name}
            >
              {product.name}
            </Link>

            {/* FULL TEXT METADATA SECTION */}
            <div className="space-y-1 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="text-[11px] sm:text-xs">
                <span className="text-neutral-400 dark:text-neutral-500 font-medium">{t('product.category')}: </span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{product.tag || 'Digital'}</span>
              </div>
              <div className="text-[11px] sm:text-xs">
                <span className="text-neutral-400 dark:text-neutral-500 font-medium">{t('product.type')}: </span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{product.type || 'Key'}</span>
              </div>
              <div className="text-[11px] sm:text-xs">
                <span className="text-neutral-400 dark:text-neutral-500 font-medium">{t('product.region')}: </span>
                <span className="font-semibold text-neutral-800 dark:text-neutral-200">{product.region || 'Global'}</span>
              </div>
              {(product.hasServicePlus || itemsList.some((i) => i.hasServicePlus)) && (
                <div className="text-[11px] sm:text-xs flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-semibold">
                  <ShieldCheck className="h-3 w-3 text-emerald-500 shrink-0" />
                  <span>Service+</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD FOOTER: SEPARATE PRICE ROW & SEPARATE BUTTONS ROW */}
        <div className="p-3.5 sm:p-4 pt-0">
          <div className="border-t border-black/5 pt-2.5 dark:border-white/5">
            {/* ROW 1: PRICE */}
            <div>
              <span className="block text-[10px] font-bold tracking-wider text-neutral-400">
                {isRange ? t('product.from') : t('common.from')}
              </span>
              <p className="font-mono text-sm sm:text-base font-black text-neutral-950 dark:text-white leading-tight mt-0.5">
                {formatNumber(minPriceMmk)} <span className="text-xs font-bold text-neutral-500 dark:text-neutral-400">{t('common.ks')}</span>
              </p>
            </div>

            {/* ROW 2: ACTION BUTTONS (BELOW PRICE) */}
            <div className="mt-2.5 flex items-center gap-1.5">
              {!isAvailable ? (
                <span className="w-full rounded-lg bg-neutral-100 py-2 text-center text-xs font-semibold text-neutral-400 dark:bg-neutral-800">
                  {t('product.outOfStock')}
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0b7e74] py-2 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-[#09665e] active:scale-[0.98]"
                    title={product.status === 'pre-order' ? t('product.preOrder') : t('product.buyNow')}
                  >
                    <Zap className="h-3.5 w-3.5" />
                    <span>{product.status === 'pre-order' ? t('product.preOrder') : t('product.buyNow')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className={`cursor-pointer grid size-8.5 shrink-0 place-items-center rounded-lg border transition-all active:scale-[0.98] ${justAdded
                      ? 'border-emerald-500 bg-emerald-500 text-white'
                      : 'border-black/10 bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                      }`}
                    title={t('product.addToCart')}
                    aria-label={t('product.addToCart')}
                  >
                    {justAdded ? <Check className="h-4 w-4" /> : <ShoppingCart className="h-3.5 w-3.5 text-[#0b7e74] dark:text-[#67dccf]" />}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </article>

      {/* QUICK VIEW MODAL */}
      <ProductQuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  )
}

