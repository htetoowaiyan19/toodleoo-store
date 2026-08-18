import { useState, useMemo } from 'react'
import { Link } from 'react-router'
import {
  Zap,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Wallet,
  Headphones,
  CheckCircle2,
  ChevronRight,
  Gamepad2,
  Cpu,
  Layers,
  ShoppingBag,
  CreditCard,
} from 'lucide-react'
import { ProductCard } from '../components/product/ProductCard'
import { useProducts } from '../utils/useProducts'
import { useTranslation } from '../utils/useTranslation'
import { ProductImage } from '../components/common/ProductImage'

export function HomePage({ featuredProducts = [] }) {
  const { categories = [], formatCurrency, products = [] } = useProducts()
  const { t } = useTranslation()
  const [activeCategory, setActiveCategory] = useState('All')

  // Available sample categories
  const sampleCategories = useMemo(
    () => categories.filter((c) => c !== 'All').slice(0, 6),
    [categories],
  )

  // Filter featured products by selected category tab
  const displayedProducts = useMemo(() => {
    if (activeCategory === 'All') {
      return featuredProducts.length > 0 ? featuredProducts : products.slice(0, 8)
    }
    return (featuredProducts.length > 0 ? featuredProducts : products).filter(
      (p) => p.category === activeCategory,
    )
  }, [activeCategory, featuredProducts, products])

  // Spotlight product for hero card
  const spotlightProduct = featuredProducts[0] || products[0] || null
  const secondarySpotlight = featuredProducts[1] || products[1] || null

  return (
    <div className="space-y-8 sm:space-y-12 pb-12">
      {/* HERO SECTION (RESPONSIVE FOR MOBILE & DESKTOP) */}
      <section className="relative overflow-hidden border-b border-black/5 bg-gradient-to-b from-[#0b7e74]/10 via-white to-transparent dark:border-white/5 dark:from-[#0b7e74]/15 dark:via-neutral-950 dark:to-neutral-950">
        <div className="mx-auto max-w-7xl px-4 py-8 sm:py-14 sm:px-6 lg:px-8">
          <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:gap-12">
            {/* LEFT: HERO COPY & CTAS */}
            <div className="space-y-4 sm:space-y-6 text-left">
              <h1 className="text-2xl sm:text-4xl lg:text-5xl font-black tracking-tight text-neutral-950 dark:text-white leading-[1.2]">
                {t('home.heroTitle')}
              </h1>

              <p className="text-xs sm:text-sm lg:text-base leading-relaxed text-neutral-600 dark:text-neutral-300 max-w-2xl">
                {t('home.heroSubtitle')}
              </p>

              {/* ACTION CTA BUTTONS */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/store"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b7e74] px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-sm transition hover:bg-[#096860] active:scale-[0.99]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  <span>{t('home.exploreStore')}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  to="/custom-order"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-black/15 bg-white px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-bold text-neutral-800 shadow-sm transition hover:bg-neutral-50 dark:border-white/15 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  <Sparkles className="h-4 w-4 text-[#0b7e74]" />
                  <span>{t('home.requestCustomOrder')}</span>
                </Link>
              </div>

              {/* TRUST METRICS STRIP */}
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4 pt-3 border-t border-black/5 dark:border-white/5 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                <div className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0b7e74] shrink-0" />
                  <span>{t('home.trustGenuine')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-[#0b7e74] shrink-0" />
                  <span>{t('home.trustFast')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <CreditCard className="h-3.5 w-3.5 text-[#0b7e74] shrink-0" />
                  <span>{t('home.trustLocalPayments')}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-[#0b7e74] shrink-0" />
                  <span>{t('home.trustWarranty')}</span>
                </div>
              </div>
            </div>

            {/* RIGHT: SPOTLIGHT SHOWCASE CARDS (SLEEK HERO PROMO) */}
            <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-1">
              {spotlightProduct && (
                <div className="group relative overflow-hidden rounded-xl border border-black/10 bg-white p-4 shadow-md transition hover:border-[#0b7e74]/50 dark:border-white/10 dark:bg-neutral-900">
                  <div className="flex items-start gap-3.5">
                    <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <ProductImage
                        image={spotlightProduct.image}
                        name={spotlightProduct.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                        fallbackClassName="text-xl font-black text-neutral-400"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-md bg-[#0b7e74]/10 px-2 py-0.5 text-[10px] font-bold text-[#0b7e74] dark:text-[#67dccf]">
                          {spotlightProduct.tag || spotlightProduct.category || 'Featured'}
                        </span>
                        <span className="text-[11px] font-black text-neutral-900 dark:text-white">
                          {formatCurrency(spotlightProduct.priceMmk || spotlightProduct.price || 0)}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {spotlightProduct.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 line-clamp-1">
                        {spotlightProduct.description || 'Instant automated digital delivery with warranty.'}
                      </p>
                      <Link
                        to={`/product/${spotlightProduct.slug}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b7e74] hover:underline pt-0.5"
                      >
                        <span>{t('common.details')}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}

              {secondarySpotlight && (
                <div className="group relative overflow-hidden rounded-xl border border-black/10 bg-white p-4 shadow-md transition hover:border-[#0b7e74]/50 dark:border-white/10 dark:bg-neutral-900 hidden sm:block">
                  <div className="flex items-start gap-3.5">
                    <div className="relative h-18 w-18 shrink-0 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
                      <ProductImage
                        image={secondarySpotlight.image}
                        name={secondarySpotlight.name}
                        className="h-full w-full object-cover group-hover:scale-105 transition duration-300"
                        fallbackClassName="text-xl font-black text-neutral-400"
                      />
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between gap-1">
                        <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                          {secondarySpotlight.tag || secondarySpotlight.category || 'Popular'}
                        </span>
                        <span className="text-[11px] font-black text-neutral-900 dark:text-white">
                          {formatCurrency(secondarySpotlight.priceMmk || secondarySpotlight.price || 0)}
                        </span>
                      </div>
                      <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white truncate">
                        {secondarySpotlight.name}
                      </h3>
                      <p className="text-[11px] text-neutral-500 line-clamp-1">
                        {secondarySpotlight.description || 'Verified product key & direct upgrade.'}
                      </p>
                      <Link
                        to={`/product/${secondarySpotlight.slug}`}
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0b7e74] hover:underline pt-0.5"
                      >
                        <span>{t('common.details')}</span>
                        <ArrowRight className="h-3 w-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* QUICK CATEGORY CHIPS STRIP */}
      {sampleCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between gap-2 border-b border-black/5 pb-2.5 dark:border-white/5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">
              {t('home.allCategories')}
            </h2>
            <Link to="/store" className="text-xs font-bold text-[#0b7e74] hover:underline">
              {t('home.viewFullCatalog')} →
            </Link>
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveCategory('All')}
              className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${activeCategory === 'All'
                ? 'bg-[#0b7e74] text-white shadow-sm'
                : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                }`}
            >
              {t('home.all')}
            </button>
            {sampleCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`cursor-pointer rounded-lg px-3.5 py-1.5 text-xs font-bold transition ${activeCategory === cat
                  ? 'bg-[#0b7e74] text-white shadow-sm'
                  : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'
                  }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* CURATED / FEATURED PRODUCTS GRID */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 border-b border-black/5 pb-3.5 dark:border-white/5">
          <div>
            <h2 className="text-lg sm:text-2xl font-black text-neutral-950 dark:text-white mt-0.5">
              {t('home.curatedTitle')}
            </h2>
          </div>
          <Link
            to="/store"
            className="inline-flex items-center gap-1 text-xs sm:text-sm font-bold text-[#0b7e74] hover:underline shrink-0"
          >
            <span>{t('home.exploreStore')}</span>
            <ChevronRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
          {displayedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* CUSTOM CONCIERGE ORDERING PROMO CARD (CLEAN & ATTRACTIVE) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-xl border border-black/10 bg-gradient-to-br from-[#0b7e74]/15 via-white to-transparent p-6 sm:p-8 shadow-sm dark:border-white/10 dark:from-[#0b7e74]/20 dark:via-neutral-900 dark:to-neutral-950">
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div className="space-y-3">
              <div className="inline-flex items-center gap-1.5 rounded-md bg-[#0b7e74]/15 px-2.5 py-0.5 text-[11px] font-bold text-[#0b7e74] dark:text-[#67dccf]">
                <Sparkles className="h-3.5 w-3.5" />
                <span>{t('customOrder.badge')}</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-neutral-950 dark:text-white leading-snug">
                {t('home.customBannerTitle')}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
                {t('home.customBannerDesc')}
              </p>

              <div className="space-y-1.5 pt-1 text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0b7e74] shrink-0" />
                  <span>{t('home.customFeature1')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0b7e74] shrink-0" />
                  <span>{t('home.customFeature2')}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-[#0b7e74] shrink-0" />
                  <span>{t('home.customFeature3')}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col justify-center items-start lg:items-end gap-3">
              <Link
                to="/custom-order"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-[#0b7e74] px-6 py-3 text-xs sm:text-sm font-bold text-white shadow-md transition hover:bg-[#096860] active:scale-[0.99]"
              >
                <Sparkles className="h-4 w-4" />
                <span>{t('home.customBtn')}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/subscriptions"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-black/10 bg-white px-5 py-2.5 text-xs font-bold text-neutral-800 transition hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
              >
                <span>{t('home.vipBtn')}</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST & CONFIDENCE PILLARS (4 CLEAN COLUMNS) */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#0b7e74]/10 text-[#0b7e74] dark:text-[#67dccf]">
              <Zap className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
              {t('home.instantDelivery')}
            </h3>
            <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('home.instantDeliveryDesc')}
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
              <Wallet className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
              {t('home.walletTopup')}
            </h3>
            <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('home.walletTopupDesc')}
            </p>
          </div>

          <div className="rounded-xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900 space-y-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <ShieldCheck className="h-4.5 w-4.5" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-neutral-900 dark:text-white">
              {t('home.warrantyProtection')}
            </h3>
            <p className="text-[11px] leading-relaxed text-neutral-500 dark:text-neutral-400">
              {t('home.warrantyProtectionDesc')}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}


