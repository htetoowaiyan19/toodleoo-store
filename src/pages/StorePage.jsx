import { useMemo, useState, useEffect, useRef } from 'react'
import { useSearchParams, Link } from 'react-router'
import {
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  LayoutGrid,
  Grid3X3,
  List,
  ArrowUpDown,
  RotateCcw,
  Sparkles,
  X,
  Package,
} from 'lucide-react'
import { ProductFilters } from '../components/product/ProductFilters'
import { ProductCard } from '../components/product/ProductCard'
import { useProducts } from '../utils/useProducts'
import { useTranslation } from '../utils/useTranslation'

export function StorePage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const { loading, products, maxProductPrice = 50000, tags = [] } = useProducts()
  const { t } = useTranslation()
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid', 'compact', 'list'
  const [itemsPerPage, setItemsPerPage] = useState(12)
  const [currentPage, setCurrentPage] = useState(1)

  const gridTopRef = useRef(null)
  const initialSearch = searchParams.get('search') || ''

  const [filters, setFilters] = useState({
    tag: searchParams.get('tag') || 'All',
    type: 'All',
    region: 'All',
    availability: 'All',
    minPrice: 0,
    maxPrice: null,
    search: initialSearch,
    sort: 'featured',
  })

  // Keep searchParams synced if initial search is present
  useEffect(() => {
    if (initialSearch && initialSearch !== filters.search) {
      setFilters((prev) => ({ ...prev, search: initialSearch }))
    }
  }, [initialSearch])

  const activeMaxPrice = filters.maxPrice ?? maxProductPrice

  const effectiveFilters = useMemo(() => {
    return {
      ...filters,
      maxPrice: activeMaxPrice,
      search: filters.search,
    }
  }, [filters, activeMaxPrice])

  // Count active filters (excluding defaults)
  const activeFilterCount = useMemo(() => {
    let count = 0
    if (effectiveFilters.search) count++
    if (effectiveFilters.tag && effectiveFilters.tag !== 'All') count++
    if (effectiveFilters.type && effectiveFilters.type !== 'All') count++
    if (effectiveFilters.region && effectiveFilters.region !== 'All') count++
    if (effectiveFilters.availability !== 'All') count++
    if (effectiveFilters.minPrice > 0 || (effectiveFilters.maxPrice < maxProductPrice && effectiveFilters.maxPrice > 0)) count++
    return count
  }, [effectiveFilters, maxProductPrice])

  // Filter and Sort Products
  const filteredProducts = useMemo(() => {
    return products
      .filter((product) => {
        const itemsList = Array.isArray(product.items) ? product.items : []
        let minItemPrice = Number(product.priceMmk || product.price || 0)

        if (itemsList.length > 0) {
          const prices = itemsList.map((i) => Number(i.priceMmk || i.price || 0))
          minItemPrice = Math.min(...prices)
        }

        const matchesTag =
          !effectiveFilters.tag ||
          effectiveFilters.tag === 'All' ||
          (product.tag && product.tag.toLowerCase() === effectiveFilters.tag.toLowerCase())

        const matchesType =
          !effectiveFilters.type ||
          effectiveFilters.type === 'All' ||
          (product.type && product.type.toLowerCase() === effectiveFilters.type.toLowerCase())

        const matchesRegion =
          !effectiveFilters.region ||
          effectiveFilters.region === 'All' ||
          (product.region && product.region.toLowerCase() === effectiveFilters.region.toLowerCase())

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
          product.description?.toLowerCase().includes(q) ||
          product.tag?.toLowerCase().includes(q) ||
          product.type?.toLowerCase().includes(q) ||
          product.region?.toLowerCase().includes(q) ||
          (product.tags && product.tags.some((t) => String(t).toLowerCase().includes(q)))

        return (
          matchesTag &&
          matchesType &&
          matchesRegion &&
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

  // Reset to page 1 whenever filters or search query change
  useEffect(() => {
    setCurrentPage(1)
  }, [effectiveFilters, itemsPerPage])

  // Pagination Math
  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / itemsPerPage))
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = Math.min(startIndex + itemsPerPage, filteredProducts.length)
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(startIndex, endIndex)
  }, [filteredProducts, startIndex, endIndex])

  function handlePageChange(pageNumber) {
    const validPage = Math.max(1, Math.min(pageNumber, totalPages))
    setCurrentPage(validPage)
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  function resetFilters() {
    setFilters({
      tag: 'All',
      type: 'All',
      region: 'All',
      availability: 'All',
      minPrice: 0,
      maxPrice: null,
      search: '',
      sort: 'featured',
    })
    setSearchParams({})
  }

  function handleQuickTag(tVal) {
    setFilters((prev) => ({ ...prev, tag: tVal }))
  }

  function removeFilterKey(key, defaultValue) {
    setFilters((prev) => ({ ...prev, [key]: defaultValue }))
    if (key === 'search') {
      setSearchParams({})
    }
  }

  // Generate page range pills with smart ellipsis
  const pageNumbers = useMemo(() => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }, [totalPages, currentPage])

  return (
    <section className="mx-auto max-w-7xl px-4 py-4 sm:py-8 sm:px-6 lg:px-8 space-y-6">
      {/* STORE HERO HEADER */}
      <div className="flex flex-col justify-between gap-3 border-b border-black/5 pb-4 dark:border-white/5 sm:flex-row sm:items-end">
        <div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-neutral-950 dark:text-white">
            {t('store.title')}
          </h1>
          <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
            {t('store.subtitle')}
          </p>
        </div>

        {/* QUICK TAG PILLS HORIZONTAL BAR */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar">
          {['All', ...tags.filter((tVal) => tVal !== 'All').slice(0, 6)].map((tVal) => {
            const isActive = (filters.tag || 'All').toLowerCase() === tVal.toLowerCase()
            return (
              <button
                key={tVal}
                type="button"
                onClick={() => handleQuickTag(tVal)}
                className={`rounded-lg px-3 py-1 text-xs font-semibold transition whitespace-nowrap cursor-pointer ${isActive
                    ? 'bg-[#0b7e74] text-white shadow-sm'
                    : 'border border-black/10 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
              >
                {tVal === 'All' ? t('store.allCategories') : tVal}
              </button>
            )
          })}
        </div>
      </div>

      <div ref={gridTopRef} />

      {/* MAIN CONTENT: DESKTOP SIDEBAR + STORE TOOLBAR & GRID */}
      <div className="grid gap-5 lg:grid-cols-[240px_1fr]">
        {/* DESKTOP SIDEBAR FILTERS */}
        <div className="hidden lg:block">
          <div className="sticky top-20">
            <ProductFilters
              filters={effectiveFilters}
              onChange={setFilters}
              activeCount={activeFilterCount}
            />
          </div>
        </div>

        {/* PRODUCT SECTION */}
        <div className="space-y-4 min-w-0">
          {/* TOP TOOLBAR: RESULTS COUNT, MOBILE FILTER BUTTON, SORT, VIEW SWITCHER & PER PAGE */}
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900">
            <div className="flex items-center gap-2">
              {/* MOBILE FILTER DRAWER BUTTON */}
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(true)}
                className="flex items-center gap-1.5 rounded-lg border border-black/10 bg-neutral-50 px-3 py-1.5 text-xs font-bold text-neutral-700 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-200 lg:hidden cursor-pointer"
              >
                <SlidersHorizontal className="h-3.5 w-3.5 text-[#0b7e74]" />
                <span>{t('common.filter')}</span>
                {activeFilterCount > 0 && (
                  <span className="grid size-4 place-items-center rounded-md bg-[#0b7e74] text-[10px] font-black text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* PRODUCTS COUNT SUMMARY */}
              <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                <span className="text-neutral-950 dark:text-white font-bold">{filteredProducts.length}</span>{' '}
                {filteredProducts.length === 1 ? 'Product' : 'Products'}
              </span>
            </div>

            {/* RIGHT SIDE CONTROLS: SORT, VIEW MODE, ITEMS PER PAGE */}
            <div className="flex flex-wrap items-center gap-2">
              {/* SORT DROPDOWN */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-bold text-neutral-400 hidden sm:inline">{t('store.sortBy')}:</span>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters((prev) => ({ ...prev, sort: e.target.value }))}
                  className="rounded-lg border border-black/10 bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-800 cursor-pointer"
                >
                  <option value="featured">{t('store.popular')}</option>
                  <option value="newest">{t('store.newest')}</option>
                  <option value="price-low">{t('store.priceLowHigh')}</option>
                  <option value="price-high">{t('store.priceHighLow')}</option>
                  <option value="rating">Highest Rated</option>
                  <option value="name-asc">Alphabetical (A-Z)</option>
                </select>
              </div>

              {/* ITEMS PER PAGE SELECTOR */}
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-bold text-neutral-400 hidden sm:inline">Show:</span>
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="rounded-lg border border-black/10 bg-neutral-50 px-2.5 py-1.5 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-800 cursor-pointer"
                  title="Products per page"
                >
                  <option value={12}>12 / page</option>
                  <option value={24}>24 / page</option>
                  <option value={36}>36 / page</option>
                  <option value={48}>48 / page</option>
                </select>
              </div>

              {/* VIEW MODE TOGGLE (DESKTOP) */}
              <div className="hidden sm:flex items-center rounded-lg border border-black/10 bg-neutral-100 p-0.5 dark:border-white/10 dark:bg-neutral-800">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`grid size-7 place-items-center rounded-md transition cursor-pointer ${viewMode === 'grid'
                      ? 'bg-white text-[#0b7e74] shadow-sm dark:bg-neutral-900 dark:text-[#67dccf]'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                    }`}
                  title="Grid View"
                >
                  <LayoutGrid className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('compact')}
                  className={`grid size-7 place-items-center rounded-md transition cursor-pointer ${viewMode === 'compact'
                      ? 'bg-white text-[#0b7e74] shadow-sm dark:bg-neutral-900 dark:text-[#67dccf]'
                      : 'text-neutral-500 hover:text-black dark:hover:text-white'
                    }`}
                  title="Compact Grid"
                >
                  <Grid3X3 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE FILTER CHIPS ROW */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-neutral-400 mr-1">{t('common.filter')}:</span>
              {effectiveFilters.search && (
                <span className="inline-flex items-center gap-1 rounded-md bg-[#0b7e74]/10 border border-[#0b7e74]/20 px-2 py-0.5 text-xs font-semibold text-[#0b7e74] dark:text-[#67dccf]">
                  <span>"{effectiveFilters.search}"</span>
                  <button
                    type="button"
                    onClick={() => removeFilterKey('search', '')}
                    className="hover:opacity-75 cursor-pointer text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {effectiveFilters.tag && effectiveFilters.tag !== 'All' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 border border-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-neutral-800 dark:border-white/5">
                  <span>{t('store.category')}: {effectiveFilters.tag}</span>
                  <button
                    type="button"
                    onClick={() => removeFilterKey('tag', 'All')}
                    className="hover:opacity-75 cursor-pointer text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {effectiveFilters.type && effectiveFilters.type !== 'All' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 border border-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-neutral-800 dark:border-white/5">
                  <span>{t('store.type')}: {effectiveFilters.type}</span>
                  <button
                    type="button"
                    onClick={() => removeFilterKey('type', 'All')}
                    className="hover:opacity-75 cursor-pointer text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {effectiveFilters.region && effectiveFilters.region !== 'All' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 border border-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-neutral-800 dark:border-white/5">
                  <span>{t('store.region')}: {effectiveFilters.region}</span>
                  <button
                    type="button"
                    onClick={() => removeFilterKey('region', 'All')}
                    className="hover:opacity-75 cursor-pointer text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {effectiveFilters.availability !== 'All' && (
                <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 border border-black/5 px-2 py-0.5 text-xs font-semibold dark:bg-neutral-800 dark:border-white/5">
                  <span>{t('common.status')}: {effectiveFilters.availability}</span>
                  <button
                    type="button"
                    onClick={() => removeFilterKey('availability', 'All')}
                    className="hover:opacity-75 cursor-pointer text-neutral-400 hover:text-black dark:hover:text-white"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-[#0b7e74] hover:underline ml-1 cursor-pointer"
              >
                {t('store.resetFilters')}
              </button>
            </div>
          )}

          {/* PRODUCT GRID */}
          {paginatedProducts.length > 0 ? (
            <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
              {paginatedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* EMPTY RESULTS STATE */
            <div className="rounded-xl border border-black/10 bg-white p-10 text-center shadow-sm dark:border-white/10 dark:bg-neutral-900">
              <div className="mx-auto grid h-14 w-14 place-items-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                <Package className="h-7 w-7 text-neutral-400" />
              </div>
              <h3 className="mt-4 text-lg font-black">{t('store.noProductsTitle')}</h3>
              <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400 max-w-sm mx-auto">
                {t('store.noProductsDesc')}
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="mt-5 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#0b7e74] px-5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-[#09665e]"
              >
                <RotateCcw className="h-3.5 w-3.5" /> {t('store.resetFilters')}
              </button>
            </div>
          )}

          {/* PAGINATION CONTROLS */}
          {totalPages > 1 && (
            <div className="mt-6 flex flex-col items-center justify-between gap-3 border-t border-black/5 pt-5 dark:border-white/5 sm:flex-row">
              {/* PAGE RANGE SUMMARY */}
              <p className="text-xs font-semibold text-neutral-500">
                Showing <span className="font-bold text-neutral-900 dark:text-white">{startIndex + 1}</span> -{' '}
                <span className="font-bold text-neutral-900 dark:text-white">{endIndex}</span> of{' '}
                <span className="font-bold text-neutral-900 dark:text-white">{filteredProducts.length}</span>
              </p>

              {/* NUMBERED PAGE BUTTONS BAR */}
              <div className="flex items-center gap-1">
                {/* PREV BUTTON */}
                <button
                  type="button"
                  disabled={currentPage <= 1}
                  onClick={() => handlePageChange(currentPage - 1)}
                  className="grid size-8 place-items-center rounded-lg border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>

                {/* NUMBERED BUTTONS */}
                {pageNumbers.map((pageNum, idx) => {
                  if (pageNum === '...') {
                    return (
                      <span key={`ellipsis-${idx}`} className="px-1 text-xs font-bold text-neutral-400">
                        ...
                      </span>
                    )
                  }

                  const isActive = pageNum === currentPage
                  return (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => handlePageChange(pageNum)}
                      className={`grid size-8 place-items-center rounded-lg text-xs font-bold transition cursor-pointer ${isActive
                          ? 'bg-[#0b7e74] text-white shadow-sm font-black'
                          : 'border border-black/10 bg-white text-neutral-700 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800'
                        }`}
                    >
                      {pageNum}
                    </button>
                  )
                })}

                {/* NEXT BUTTON */}
                <button
                  type="button"
                  disabled={currentPage >= totalPages}
                  onClick={() => handlePageChange(currentPage + 1)}
                  className="grid size-8 place-items-center rounded-lg border border-black/10 bg-white text-neutral-700 shadow-sm transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800 cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* MOBILE FILTER MODAL DRAWER */}
      {isMobileFilterOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm lg:hidden">
          <div className="h-full w-full max-w-xs overflow-y-auto bg-white p-5 shadow-2xl dark:bg-neutral-900 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between border-b border-black/10 pb-3 dark:border-white/10">
              <h3 className="text-base font-black">{t('common.filter')}</h3>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen(false)}
                className="cursor-pointer rounded-lg p-1.5 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-white"
              >
                <X className="h-4 w-4" />
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
              className="mt-5 w-full cursor-pointer rounded-lg bg-[#0b7e74] py-2.5 text-xs font-bold text-white shadow-md transition hover:bg-[#09665e]"
            >
              {t('common.view')} ({filteredProducts.length})
            </button>
          </div>
        </div>
      )}
    </section>
  )
}


