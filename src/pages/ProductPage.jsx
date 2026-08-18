import { Link, useNavigate, useParams } from 'react-router'
import { useState, useEffect, useMemo } from 'react'
import { Check, ChevronDown, ChevronUp, Zap, ShieldCheck, ChevronRight, ArrowLeft } from 'lucide-react'
import { useCart } from '../utils/useCart'
import { useAuth } from '../utils/useAuth'
import { formatNumber } from '../utils/format'
import { useProducts } from '../utils/useProducts'
import { useTranslation } from '../utils/useTranslation'
import { getProductStatusDetails } from '../utils/productStatus'
import { ProductImage } from '../components/common/ProductImage'
import { getUserSubscription } from '../utils/subscriptionPlans'
import { calculateItemWarranty } from '../utils/warrantyUtils'

export function ProductPage() {
  const { slug } = useParams()
  const { addToCart } = useCart()
  const { products } = useProducts()
  const { profile } = useAuth()
  const { t } = useTranslation()
  const navigate = useNavigate()

  const [isExpanded, setIsExpanded] = useState(false)

  const product = products.find((item) => item.slug === slug)
  const itemsList = Array.isArray(product?.items) ? product.items : []
  const isGroup = product?.productType === 'group' || itemsList.length > 1

  const [selectedItem, setSelectedItem] = useState(null)

  const subData = useMemo(() => getUserSubscription(profile), [profile])

  useEffect(() => {
    if (itemsList.length > 0) {
      const inStockItem = itemsList.find((i) => i.status === 'instock' && i.stock > 0) || itemsList[0]
      setSelectedItem(inStockItem)
    }
  }, [product?.id])

  if (!product) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-20 text-center">
        <h1 className="text-4xl font-black">{t('product.outOfStock')}</h1>
        <Link to="/store" className="mt-6 inline-block font-bold text-[#0b7e74]">
          {t('common.back')} {t('nav.store')}
        </Link>
      </section>
    )
  }

  const activeItem = selectedItem || itemsList[0] || null
  const displayPrice = activeItem ? activeItem.priceMmk : (product.priceMmk || product.price || 0)

  const warrantyInfo = useMemo(() => {
    return calculateItemWarranty({
      item: activeItem || product,
      userTier: subData.tier,
    })
  }, [activeItem, product, subData.tier])

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
    <section className="mx-auto max-w-7xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8 space-y-6">
      {/* BREADCRUMB & BACK NAVIGATION */}
      <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-3 dark:border-white/5">
        <nav className="flex items-center gap-1.5 text-xs text-neutral-500 dark:text-neutral-400">
          <Link to="/store" className="hover:text-black dark:hover:text-white transition font-semibold">
            {t('nav.store')}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
          <Link
            to={`/store?tag=${encodeURIComponent(product.tag || 'All')}`}
            className="hover:text-black dark:hover:text-white transition font-semibold"
          >
            {product.tag || 'Digital'}
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-neutral-400" />
          <span className="font-bold text-neutral-900 dark:text-white truncate max-w-[150px] sm:max-w-[250px]">
            {product.name}
          </span>
        </nav>

        {/* STATUS BADGE */}
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold shrink-0 ${statusDetails.badgeClass}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dotClass}`} />
          {product.status === 'pre-order' ? t('product.preOrder') : isAvailable ? t('product.inStock') : t('product.outOfStock')}
        </span>
      </div>

      {/* MAIN TWO-COLUMN GRID */}
      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12 items-start">
        {/* LEFT COLUMN: PRODUCT HERO IMAGE */}
        <div className="space-y-4">
          <div
            className={`relative aspect-square w-full overflow-hidden rounded-xl bg-gradient-to-br ${product.gradient || 'from-[#0fa697] to-[#ff655b]'} shadow-sm border border-black/10 dark:border-white/10`}
          >
            <ProductImage
              image={product.image}
              name={product.name}
              className="h-full w-full object-cover"
              fallbackClassName="text-8xl font-black text-white drop-shadow-md"
            />
          </div>
        </div>

        {/* RIGHT COLUMN: PRODUCT DETAILS & PURCHASE */}
        <div className="space-y-5">
          {/* TITLE */}
          <div>
            <h1 className="text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white tracking-tight">
              {product.name}
            </h1>
          </div>

          {/* STRUCTURED PRODUCT SPECIFICATIONS */}
          <div className="rounded-xl border border-black/10 bg-neutral-50/80 p-4 dark:border-white/10 dark:bg-neutral-900/60">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
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
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">{t('product.delivery')}</span>
                <p className="font-bold text-neutral-800 dark:text-neutral-200 mt-0.5 flex items-center gap-1">
                  <Zap className="h-3 w-3 text-amber-500 fill-amber-500" />
                  <span>{t('product.instantDelivery')}</span>
                </p>
              </div>

              {/* WARRANTY ROW */}
              {warrantyInfo?.hasWarranty && (
                <div className="col-span-2 sm:col-span-4 border-t border-black/5 pt-2.5 mt-0.5 dark:border-white/5 flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t('product.warranty')}</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Service+ {warrantyInfo.totalMonths} Months Protection</span>
                    {warrantyInfo.memberBonusMonths > 0 && (
                      <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">
                        (+{warrantyInfo.memberBonusMonths}M VIP Extension)
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* DESCRIPTION */}
          {product.description && (
            <div className="text-xs sm:text-sm leading-relaxed text-neutral-600 dark:text-neutral-300">
              <p className={`whitespace-pre-line ${!isExpanded && product.description.length > 220 ? 'line-clamp-4' : ''}`}>
                {product.description}
              </p>
              {product.description.length > 220 && (
                <button
                  type="button"
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="mt-2 inline-flex cursor-pointer items-center gap-1 font-bold text-xs text-[#0b7e74] hover:underline"
                >
                  {isExpanded ? (
                    <>
                      See Less <ChevronUp className="h-3.5 w-3.5" />
                    </>
                  ) : (
                    <>
                      See More <ChevronDown className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* GROUP PRODUCT OPTION SELECTOR */}
          {isGroup && itemsList.length > 0 && (
            <div className="space-y-2 rounded-xl border border-black/10 bg-neutral-50/50 p-4 dark:border-white/10 dark:bg-neutral-900/40">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                {t('product.selectOption')}
              </span>
              <div className="flex flex-wrap gap-2 pt-0.5">
                {itemsList.map((it) => {
                  const isSelected = activeItem?.id === it.id
                  return (
                    <button
                      key={it.id}
                      type="button"
                      onClick={() => setSelectedItem(it)}
                      className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3.5 py-2 text-xs font-bold transition active:scale-[0.98] ${
                        isSelected
                          ? 'border-[#0b7e74] bg-[#0b7e74] text-white shadow-sm'
                          : 'border-black/10 bg-white text-neutral-800 hover:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-800 dark:text-white'
                      }`}
                    >
                      <span>{it.name || 'Standard'}</span>
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono font-bold ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300'
                        }`}
                      >
                        {formatNumber(it.priceMmk)} {t('common.ks')}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* PRICE & ACTION BUTTONS */}
          <div className="space-y-3 pt-3 border-t border-black/5 dark:border-white/5">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                {t('common.from')}
              </span>
              <div className="mt-0.5 flex items-baseline gap-1.5">
                <span className="font-mono text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white">
                  {formatNumber(displayPrice)}
                </span>
                <span className="text-sm font-bold text-neutral-500 dark:text-neutral-400">{t('common.ks')}</span>
              </div>
            </div>

            {/* ACTION BUTTONS */}
            <div>
              {!isAvailable ? (
                <button
                  type="button"
                  disabled
                  className="w-full cursor-not-allowed rounded-lg bg-neutral-200 py-3 text-sm font-bold text-neutral-500 opacity-60 dark:bg-neutral-800 dark:text-neutral-400"
                >
                  {t('product.outOfStock')}
                </button>
              ) : product.status === 'pre-order' ? (
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 cursor-pointer rounded-lg bg-amber-600 px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-amber-700 active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>{t('product.preOrder')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 cursor-pointer rounded-lg border border-black/10 bg-white px-7 py-3 text-sm font-bold transition hover:bg-neutral-100 active:scale-[0.99] dark:border-white/10 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-center"
                  >
                    {t('product.addToCart')}
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-2.5 sm:flex-row">
                  <button
                    type="button"
                    onClick={handleBuyNow}
                    className="flex-1 cursor-pointer rounded-lg bg-[#0b7e74] px-7 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#09665e] active:scale-[0.99] flex items-center justify-center gap-2"
                  >
                    <Zap className="h-4 w-4" />
                    <span>{t('product.buyNow')}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleAddToCart}
                    className="flex-1 cursor-pointer rounded-lg border border-black/10 bg-white px-7 py-3 text-sm font-bold transition hover:bg-neutral-100 active:scale-[0.99] dark:border-white/10 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-center"
                  >
                    {t('product.addToCart')}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* FEATURES / INCLUDES LIST */}
          {product.includes?.length > 0 && (
            <div className="border-t border-black/10 pt-5 dark:border-white/10">
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block">
                {t('product.includes')}
              </span>
              <ul className="mt-3 space-y-2">
                {product.includes.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-xs font-semibold text-neutral-800 dark:text-neutral-200">
                    <span className="grid size-4 place-items-center rounded-md bg-[#0b7e74]/10 text-[#0b7e74]">
                      <Check className="h-2.5 w-2.5 stroke-[3]" />
                    </span>
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

