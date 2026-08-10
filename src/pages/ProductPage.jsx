import { Link, useNavigate, useParams } from 'react-router'

import { useState, useEffect } from 'react'
import { Check, ChevronDown, ChevronUp, Zap } from 'lucide-react'
import { useCart } from '../utils/useCart'
import { formatCurrency } from '../utils/format'
import { useProducts } from '../utils/useProducts'
import { getProductStatusDetails } from '../utils/productStatus'
import { ProductImage } from '../components/common/ProductImage'

export function ProductPage() {
  const { slug } = useParams()
  const { addToCart } = useCart()
  const { products } = useProducts()
  const navigate = useNavigate()
  const [isExpanded, setIsExpanded] = useState(false)

  const product = products.find((item) => item.slug === slug)
  const itemsList = Array.isArray(product?.items) ? product.items : []
  const isGroup = product?.productType === 'group' || itemsList.length > 1

  const [selectedItem, setSelectedItem] = useState(null)

  useEffect(() => {
    if (itemsList.length > 0) {
      const inStockItem = itemsList.find((i) => i.status === 'instock' && i.stock > 0) || itemsList[0]
      setSelectedItem(inStockItem)
    }
  }, [product?.id])

  if (!product) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black">Product not found</h1>
        <Link to="/store" className="mt-6 inline-block font-bold text-[#0b7e74]">
          Back to store
        </Link>
      </section>
    )
  }

  const activeItem = selectedItem || itemsList[0] || null
  const displayPrice = activeItem ? activeItem.priceMmk : (product.priceMmk || product.price || 0)

  const statusDetails = getProductStatusDetails(
    activeItem ? activeItem.status : product.status,
    activeItem ? activeItem.stock : product.stock,
  )
  const isAvailable = statusDetails.isAvailable

  function handleBuyNow() {
    navigate('/checkout', {
      state: {
        directItem: {
          product,
          quantity: 1,
          selectedVariant: activeItem,
        },
      },
    })
  }


  function handleAddToCart() {
    addToCart(product, 1, activeItem)
  }

  return (
    <section className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:px-8">
      <div
        className={`relative grid aspect-square place-items-center overflow-hidden rounded-2xl bg-gradient-to-br ${product.gradient} shadow-xl`}
      >
        <ProductImage
          image={product.image}
          name={product.name}
          className="h-full w-full object-cover"
          fallbackClassName="text-8xl font-black text-white drop-shadow-md"
        />
      </div>

      <div>
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-bold text-[#0b7e74]">{product.category}</span>
          <span className="text-neutral-300">•</span>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${statusDetails.badgeClass}`}
          >
            <span className={`h-2 w-2 rounded-full ${statusDetails.dotClass}`} />
            {statusDetails.label}
          </span>
        </div>

        {statusDetails.sub && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-neutral-500 dark:text-neutral-400">
            <Zap className="h-3.5 w-3.5 fill-current text-amber-500" /> Delivery guarantee: <span className="font-bold text-black dark:text-white">{statusDetails.sub}</span>
          </p>
        )}

        <h1 className="mt-3 text-4xl font-black sm:text-5xl">{product.name}</h1>

        <div className="mt-5 text-base leading-7 text-neutral-600 dark:text-neutral-300">
          <p className={`whitespace-pre-line ${!isExpanded && (product.description?.length > 220) ? 'line-clamp-4' : ''}`}>
            {product.description}
          </p>
          {product.description?.length > 220 && (
            <button
              type="button"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2.5 inline-flex cursor-pointer items-center gap-1 font-bold text-[#0b7e74] hover:underline"
            >
              {isExpanded ? (
                <>
                  See Less <ChevronUp className="h-4 w-4" />
                </>
              ) : (
                <>
                  See More <ChevronDown className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>

        {/* GROUP PRODUCT OPTION SELECTOR */}
        {isGroup && itemsList.length > 0 && (
          <div className="mt-6 rounded-2xl border border-black/10 bg-neutral-50 p-4 dark:border-white/10 dark:bg-neutral-900">
            <p className="text-xs font-black uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
              Select Option / Duration / Tier:
            </p>
            <div className="mt-3 flex flex-wrap gap-2.5">
              {itemsList.map((it) => {
                const isSelected = activeItem?.id === it.id
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => setSelectedItem(it)}
                    className={`flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2.5 text-xs font-bold transition ${
                      isSelected
                        ? 'border-[#0b7e74] bg-[#0b7e74] text-white shadow-md'
                        : 'border-black/10 bg-white text-neutral-800 hover:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-800 dark:text-white'
                    }`}
                  >
                    <span>{it.name || 'Standard'}</span>
                    <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-black ${isSelected ? 'bg-white/20 text-white' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'}`}>
                      {formatCurrency(it.priceMmk)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        <div className="mt-6 flex flex-col sm:flex-row sm:items-baseline gap-2 sm:gap-3">
          <span className="text-4xl font-black font-mono">
            {formatCurrency(displayPrice)}
          </span>
          {activeItem?.priceUsd > 0 && (
            <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">
              (${activeItem.priceUsd.toFixed(2)} USD)
            </span>
          )}
        </div>


        {/* ACTION BUTTONS */}
        <div className="mt-8">
          {!isAvailable ? (
            <button
              type="button"
              disabled
              className="w-full cursor-not-allowed rounded-full bg-neutral-200 py-4 font-black text-neutral-500 opacity-60 dark:bg-neutral-800 dark:text-neutral-400 sm:w-auto sm:px-8"
            >
              Out of Stock
            </button>
          ) : product.status === 'pre-order' ? (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleBuyNow}
                className="cursor-pointer rounded-full bg-amber-600 px-8 py-4 font-black text-white shadow-lg transition hover:bg-amber-700 active:scale-[0.99]"
              >
                Order Now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="cursor-pointer rounded-full border border-black/10 bg-white px-8 py-4 font-black transition hover:bg-neutral-100 active:scale-[0.99] dark:border-white/10 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                Add to Cart
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleBuyNow}
                className="cursor-pointer rounded-full bg-neutral-950 px-8 py-4 font-black text-white shadow-lg transition hover:bg-[#0fa697] active:scale-[0.99] dark:bg-white dark:text-neutral-950 dark:hover:bg-[#0fa697] dark:hover:text-white"
              >
                Buy Now
              </button>
              <button
                type="button"
                onClick={handleAddToCart}
                className="cursor-pointer rounded-full border border-black/10 bg-white px-8 py-4 font-black transition hover:bg-neutral-100 active:scale-[0.99] dark:border-white/10 dark:bg-neutral-800 dark:hover:bg-neutral-700"
              >
                Add to Cart
              </button>
            </div>
          )}
        </div>

        {/* FEATURES / INCLUDES LIST */}
        {product.includes?.length > 0 && (
          <div className="mt-10 border-t border-black/10 pt-8 dark:border-white/10">
            <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              What&apos;s Included & Features:
            </p>
            <ul className="mt-4 space-y-3">
              {product.includes.map((feature) => (
                <li key={feature} className="flex items-center gap-3 text-sm font-semibold">
                  <span className="grid size-5 place-items-center rounded-full bg-[#0b7e74]/10 text-[#0b7e74]">
                    <Check className="h-3 w-3 stroke-[3]" />
                  </span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  )
}
