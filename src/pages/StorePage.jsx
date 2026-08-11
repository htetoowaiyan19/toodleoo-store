import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router'
import { ProductFilters } from '../components/product/ProductFilters'
import { ProductCard } from '../components/product/ProductCard'
import { useProducts } from '../utils/useProducts'

export function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { loading, products, maxProductPrice = 50000 } = useProducts()
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)

  const initialSearch = searchParams.get('search') || ''


  const [filters, setFilters] = useState({
    category: 'All',
    platform: 'All',
    availability: 'All',
    minPrice: 0,
    maxPrice: null,
    search: initialSearch,
    sort: 'featured',
  })

  const activeMaxPrice = filters.maxPrice ?? maxProductPrice

  const effectiveFilters = useMemo(() => {
    return {
      ...filters,
      maxPrice: activeMaxPrice,
      search: initialSearch || filters.search,
    }
  }, [filters, activeMaxPrice, initialSearch])

  // Count active filters (excluding defaults)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (effectiveFilters.search) count++
    if (effectiveFilters.category !== 'All') count++
    if (effectiveFilters.platform !== 'All') count++
    if (effectiveFilters.availability !== 'All') count++
    if (effectiveFilters.minPrice > 0 || (effectiveFilters.maxPrice < maxProductPrice && effectiveFilters.maxPrice > 0)) count++
    return count
  }, [effectiveFilters, maxProductPrice])

  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const itemsList = Array.isArray(product.items) ? product.items : []
        let minItemPrice = Number(product.priceMmk || product.price || 0)

        if (itemsList.length > 0) {
          const prices = itemsList.map((i) => Number(i.priceMmk || i.price || 0))
          minItemPrice = Math.min(...prices)
        }

        const matchesCategory =
          effectiveFilters.category === 'All' ||
          product.category.toLowerCase() === effectiveFilters.category.toLowerCase()

        const matchesPlatform =
          effectiveFilters.platform === 'All' ||
          product.platform.toLowerCase() === effectiveFilters.platform.toLowerCase()

        const matchesPrice = minItemPrice <= effectiveFilters.maxPrice

        let matchesAvailability = true
        if (effectiveFilters.availability === 'instock') {
          matchesAvailability = product.status === 'instock' && product.stock > 0
        } else if (effectiveFilters.availability === 'pre-order') {
          matchesAvailability = product.status === 'pre-order'
        }

        const q = effectiveFilters.search.trim().toLowerCase()
        const matchesSearch =
          !q ||
          product.name.toLowerCase().includes(q) ||
          product.description.toLowerCase().includes(q) ||
          product.category.toLowerCase().includes(q) ||
          product.platform.toLowerCase().includes(q) ||
          (product.tags && product.tags.some((t) => String(t).toLowerCase().includes(q)))

        return (
          matchesCategory &&
          matchesPlatform &&
          matchesPrice &&
          matchesAvailability &&
          matchesSearch
        )
      })
      .sort((a, b) => {
        const getRank = (prod) => {
          const isInstock = prod.status === 'instock' && Number(prod.stock || 0) > 0
          if (isInstock) return 1
          const isPreorder = prod.status === 'pre-order' || prod.status === 'preorder'
          if (isPreorder) return 2
          return 3
        }

        const rankA = getRank(a)
        const rankB = getRank(b)

        if (rankA !== rankB) {
          return rankA - rankB
        }

        const priceA = Number(a.priceMmk || a.price || 0)
        const priceB = Number(b.priceMmk || b.price || 0)

        if (effectiveFilters.sort === 'price-low') return priceA - priceB
        if (effectiveFilters.sort === 'price-high') return priceB - priceA
        if (effectiveFilters.sort === 'rating') return (b.rating || 0) - (a.rating || 0)
        if (effectiveFilters.sort === 'newest') return new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0)
        if (effectiveFilters.sort === 'featured' && Number(b.featured) !== Number(a.featured)) {
          return Number(b.featured) - Number(a.featured)
        }

        return a.name.localeCompare(b.name)
      })
  }, [effectiveFilters, products])


  function resetFilters() {
    setFilters({
      category: 'All',
      platform: 'All',
      availability: 'All',
      minPrice: 0,
      maxPrice: null,
      search: '',
      sort: 'featured',
    })
    setSearchParams({})
  }


  return (
    <section className="mx-auto max-w-7xl px-4 py-4 sm:py-10 sm:px-6 lg:px-8">
      {/* MAIN LAYOUT WITH DESKTOP SIDEBAR AND PRODUCT GRID */}
      <div className="mt-6 grid gap-8 lg:grid-cols-[280px_1fr]">
        <div className="hidden lg:block">
          <ProductFilters
            filters={effectiveFilters}
            onChange={setFilters}
            activeCount={activeFilterCount}
          />
        </div>

        {/* PRODUCT GRID / EMPTY STATE */}
        <div>
          {filteredProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-6 lg:grid-cols-3">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (

            <div className="rounded-3xl border border-black/10 bg-white p-12 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900">
              <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                <svg className="h-8 w-8 text-neutral-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="mt-4 text-xl font-black">No products found</h3>
              <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
                We couldn't find any products matching your active search query and filters.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-6 inline-flex cursor-pointer items-center gap-2 rounded-full bg-[#0b7e74] px-6 py-3 text-sm font-bold text-white transition hover:bg-[#09665e]"
              >
                Reset All Filters
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FILTER MODAL DRAWER */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="h-full w-full max-w-xs overflow-y-auto bg-white p-5 shadow-2xl dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
              <h3 className="text-base font-black">Filters & Sort</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="cursor-pointer rounded-full p-1 font-bold text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="mt-4">
              <ProductFilters
                filters={filters}
                onChange={setFilters}
                activeCount={activeFilterCount}
              />
            </div>

            <button
              type="button"
              onClick={() => setIsMobileFilterOpen(false)}
              className="mt-6 w-full cursor-pointer rounded-full bg-neutral-950 px-5 py-3 text-sm font-bold text-white dark:bg-white dark:text-neutral-950"
            >
              Apply Filters ({filteredProducts.length})
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
