import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { useProducts } from '../../utils/useProducts'
import { formatCurrency, formatPriceRange } from '../../utils/format'
import { getProductStatusDetails } from '../../utils/productStatus'
import { ProductImage } from '../common/ProductImage'



export function GlobalSearch({ placeholder = 'Search products by name, category, or tag...', className = '' }) {
  const { products } = useProducts()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const searchRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(event) {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const trimmed = query.trim().toLowerCase()
  const results = trimmed
    ? products.filter(
        (p) =>
          p.name.toLowerCase().includes(trimmed) ||
          p.category.toLowerCase().includes(trimmed) ||
          p.platform.toLowerCase().includes(trimmed) ||
          p.description.toLowerCase().includes(trimmed) ||
          (p.tags && p.tags.some((t) => String(t).toLowerCase().includes(trimmed)))
      ).slice(0, 5)
    : []

  function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setIsOpen(false)
    navigate(`/store?search=${encodeURIComponent(query.trim())}`)
  }

  function handleSelectProduct(slug) {
    setIsOpen(false)
    setQuery('')
    navigate(`/product/${slug}`)
  }

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="pointer-events-none absolute left-4 text-neutral-400">
          <svg className="h-5 w-5 fill-current" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z"
              clipRule="evenodd"
            />
          </svg>
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setIsOpen(true)
          }}
          onFocus={() => setIsOpen(true)}
          placeholder={placeholder}
          className="w-full rounded-full border border-black/10 bg-white/90 py-3.5 pl-11 pr-10 text-sm font-medium shadow-sm outline-none transition-all placeholder:text-neutral-400 hover:border-black/20 focus:border-[#0b7e74] focus:bg-white focus:ring-4 focus:ring-[#0b7e74]/15 dark:border-white/10 dark:bg-neutral-900/90 dark:focus:border-[#0b7e74] dark:focus:bg-neutral-900"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setIsOpen(false)
            }}
            className="absolute right-3.5 cursor-pointer rounded-full p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </form>

      {/* DROPDOWN QUICK RESULTS */}
      {isOpen && trimmed.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-black/10 bg-white p-2 shadow-2xl backdrop-blur-xl dark:border-white/10 dark:bg-neutral-900">
          {results.length > 0 ? (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-neutral-400">
                Quick Search Results ({results.length})
              </div>
              {results.map((product) => {
                const statusDetails = getProductStatusDetails(product.status, product.stock)
                const hasVars = Array.isArray(product.variants) && product.variants.length > 0
                let minP = product.priceMmk || product.price
                let maxP = product.priceMmk || product.price

                if (hasVars) {
                  const varPrices = product.variants.map((v) => Number(v.priceMmk || 0))
                  minP = Math.min(...varPrices)
                  maxP = Math.max(...varPrices)
                }

                const isRange = hasVars && minP < maxP


                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product.slug)}
                    className="flex w-full cursor-pointer items-center justify-between gap-3 p-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${product.gradient}`}>
                        <ProductImage
                          image={product.image}
                          name={product.name}
                          className="h-full w-full object-cover"
                          fallbackClassName="text-xs font-black text-white"
                        />
                      </div>

                      <div>
                        <p className="text-sm font-bold text-black dark:text-white line-clamp-1">
                          {product.name}
                        </p>
                        <p className="text-xs text-neutral-400">
                          {product.category} • {product.platform}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-sm font-black text-black dark:text-white">
                        {isRange
                          ? formatPriceRange(minP, maxP)
                          : formatCurrency(minP)}
                      </p>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold ${statusDetails.badgeClass}`}>
                        {statusDetails.label}
                      </span>
                    </div>

                  </button>
                )
              })}

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full cursor-pointer bg-neutral-50 px-4 py-2.5 text-center text-xs font-bold text-[#0b7e74] transition hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800"
              >
                View all results for "{query}" in Store →
              </button>
            </div>
          ) : (
            <div className="p-6 text-center">
              <p className="text-sm font-bold text-neutral-600 dark:text-neutral-300">
                No products found matching "{query}"
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-2 text-xs font-bold text-[#0b7e74] hover:underline"
              >
                Search full catalog in Store →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
