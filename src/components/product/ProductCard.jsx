import { Link, useNavigate } from 'react-router'

import { useCart } from '../../utils/useCart'
import { useProducts } from '../../utils/useProducts'
import { getProductStatusDetails } from '../../utils/productStatus'
import { ProductImage } from '../common/ProductImage'

export function ProductCard({ product }) {
  const { addToCart } = useCart()
  const navigate = useNavigate()
  const { formatCurrency, formatPriceRange } = useProducts()


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
    addToCart(product, 1, defaultItem)
  }

  return (
    <article className="group flex flex-col justify-between overflow-hidden rounded-2xl border border-black/10 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl dark:border-white/10 dark:bg-neutral-900">
      <div>
        <Link to={`/product/${product.slug}`} className="block">
          <div
            className={`relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-gradient-to-br ${product.gradient}`}
          >
            <ProductImage
              image={product.image}
              name={product.name}
              className="h-full w-full object-cover transition group-hover:scale-105"
              fallbackClassName="text-3xl sm:text-5xl font-black text-white drop-shadow-sm"
            />
          </div>
        </Link>

        <div className="space-y-2 p-3 sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] sm:text-xs font-bold ${statusDetails.badgeClass}`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dotClass}`} />
              {statusDetails.label}
            </span>
          </div>

          {statusDetails.sub && (
            <p className="text-[10px] sm:text-[11px] font-medium text-neutral-500 dark:text-neutral-400">
              ⚡ {statusDetails.sub}
            </p>
          )}

          <div>
            <Link
              to={`/product/${product.slug}`}
              className="text-xs sm:text-lg font-bold transition hover:text-[#0fa697] line-clamp-1"
            >
              {product.name}
            </Link>
            <p className="mt-0.5 line-clamp-2 text-[11px] sm:text-sm leading-4 sm:leading-6 text-neutral-600 dark:text-white/60">
              {product.description}
            </p>
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-5 pt-0">
        <div className="border-t border-black/5 pt-2.5 sm:pt-4 dark:border-white/5">
          <div className="flex flex-col">
            <span className="text-xs sm:text-xl font-black font-mono">
              {isRange
                ? formatPriceRange(minPriceMmk, maxPriceMmk)
                : formatCurrency(minPriceMmk)}

            </span>
          </div>




          {/* ACTION BUTTONS */}
          <div className="mt-2 sm:mt-3.5">
            {!isAvailable ? (
              <button
                type="button"
                disabled
                className="w-full cursor-not-allowed rounded-full bg-neutral-200 py-2 text-[11px] sm:text-xs font-bold text-neutral-500 opacity-60 dark:bg-neutral-800 dark:text-neutral-400"
              >
                Out of Stock
              </button>
            ) : product.status === 'pre-order' ? (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-1/2 cursor-pointer rounded-full bg-amber-600 px-2 py-2 text-[11px] sm:text-xs font-black text-white transition hover:bg-amber-700 active:scale-[0.98]"
                >
                  Order
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-1/2 cursor-pointer rounded-full border border-amber-600/30 px-2 py-2 text-[11px] sm:text-xs font-bold text-amber-700 transition hover:bg-amber-50 dark:border-amber-500/30 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                  + Cart
                </button>
              </div>
            ) : (
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={handleBuyNow}
                  className="w-1/2 cursor-pointer rounded-full bg-[#0fa697] px-2 py-2 text-[11px] sm:text-xs font-black text-white transition hover:bg-[#0d8e81] active:scale-[0.98]"
                >
                  Buy
                </button>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="w-1/2 cursor-pointer rounded-full border border-black/10 bg-neutral-100 px-2 py-2 text-[11px] sm:text-xs font-bold text-neutral-700 transition hover:bg-neutral-200 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200"
                >
                  + Cart
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </article>
  )
}
