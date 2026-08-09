import { Link } from 'react-router'
import { ProductCard } from '../components/product/ProductCard'
import { useProducts } from '../utils/useProducts'
import { ProductImage } from '../components/common/ProductImage'

export function HomePage({ featuredProducts }) {
  const { categories = [] } = useProducts()
  const sampleCategories = categories.filter((c) => c !== 'All').slice(0, 5)

  return (
    <>
      {/* HERO SECTION (DESKTOP ONLY - HIDDEN ON MOBILE) */}
      <section className="hidden md:block bg-white dark:bg-neutral-950">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#0fa697]/10 px-4 py-2 text-sm font-bold text-[#0b7e74]">
              ⚡ Premium Digital Store & Accounts
            </span>
            <h1 className="mt-6 max-w-3xl text-4xl font-black tracking-tight sm:text-6xl">
              Instant digital products for creators & teams.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-neutral-600 dark:text-white/60">
              Browse verified subscriptions, digital tools, streaming access, and templates with instant delivery and secure wallet checkout.
            </p>

            {/* CATEGORY QUICK CHIPS */}
            {sampleCategories.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-neutral-400">Popular Categories:</span>
                {sampleCategories.map((cat) => (
                  <Link
                    key={cat}
                    to={`/store?search=${encodeURIComponent(cat)}`}
                    className="rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold transition hover:bg-[#0b7e74] hover:text-white dark:bg-neutral-800"
                  >
                    {cat}
                  </Link>
                ))}
              </div>
            )}

            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/store"
                className="rounded-full bg-gradient-to-r from-[#0fa697] to-[#ff655b] px-6 py-3.5 font-black text-white shadow-lg transition hover:opacity-90 active:scale-[0.99]"
              >
                Explore Full Store Catalog →
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-neutral-950 p-5 shadow-2xl">
            <div className="grid gap-4 sm:grid-cols-2">
              {featuredProducts.slice(0, 4).map((product) => (
                <Link
                  key={product.id}
                  to={`/product/${product.slug}`}
                  className="group relative block aspect-square overflow-hidden rounded-xl"
                >
                  <div
                    className={`relative flex h-full w-full flex-col justify-between overflow-hidden bg-gradient-to-br ${product.gradient} p-5 text-white transition group-hover:scale-105`}
                  >
                    <div className="h-20 w-20 overflow-hidden rounded-xl bg-black/20 p-1">
                      <ProductImage
                        image={product.image}
                        name={product.name}
                        className="h-full w-full object-cover rounded-lg"
                        fallbackClassName="text-3xl font-black text-white drop-shadow-sm"
                      />
                    </div>
                    <div className="relative z-10 bg-gradient-to-t from-black/80 to-transparent p-2 rounded-lg">
                      <p className="text-xs font-bold uppercase tracking-wider opacity-90">
                        {product.category}
                      </p>
                      <p className="mt-1 text-sm font-bold line-clamp-1">{product.name}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS SECTION */}
      <section className="mx-auto max-w-7xl px-4 py-6 sm:py-14 sm:px-6 lg:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="font-bold text-[#0b7e74] text-xs sm:text-base">Featured Drops</p>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black">Popular Items</h2>
          </div>
          <Link to="/store" className="font-bold text-[#ff655b] text-xs sm:text-sm transition hover:underline">
            View full catalog ({featuredProducts.length} items) →
          </Link>
        </div>
        <div className="mt-4 sm:mt-8 grid grid-cols-2 gap-3 sm:gap-6 md:grid-cols-3 lg:grid-cols-4">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      {/* CONFIDENCE BANNER */}
      <section className="bg-white dark:bg-neutral-950">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-8 sm:py-12 sm:grid-cols-3 sm:px-6 lg:px-8">
          {[
            {
              title: 'Instant Delivery',
              desc: 'Receive digital credentials or text codes directly in your account dashboard.',
            },
            {
              title: 'Wallet & Manual Pay',
              desc: 'Recharge your MMK wallet or pay via manual KPay/WavePay receipts.',
            },
            {
              title: 'Guaranteed Support',
              desc: 'Live notifications and dedicated admin review for all transactions.',
            },
          ].map((item) => (
            <div
              key={item.title}
              className="rounded-2xl border border-black/10 p-5 dark:border-white/10 dark:bg-neutral-900"
            >
              <h3 className="text-base font-bold text-[#0fa697]">{item.title}</h3>
              <p className="mt-2 text-xs leading-5 text-neutral-600 dark:text-white/60">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
