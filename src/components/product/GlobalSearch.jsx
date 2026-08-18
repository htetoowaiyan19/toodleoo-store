import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router'
import { Search, X, ArrowRight } from 'lucide-react'
import { useProducts } from '../../utils/useProducts'
import { formatCurrency, formatPriceRange } from '../../utils/format'
import { getProductStatusDetails } from '../../utils/productStatus'
import { ProductImage } from '../common/ProductImage'

export function GlobalSearch({ placeholder = 'Search products by name, category, or tag...', className = '', onSelect }) {
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
          (p.tag && p.tag.toLowerCase().includes(trimmed)) ||
          (p.type && p.type.toLowerCase().includes(trimmed)) ||
          (p.region && p.region.toLowerCase().includes(trimmed)) ||
          (p.description && p.description.toLowerCase().includes(trimmed)) ||
          (p.tags && p.tags.some((t) => String(t).toLowerCase().includes(trimmed)))
      ).slice(0, 5)
    : []

  function handleSubmit(e) {
    e.preventDefault()
    if (!query.trim()) return
    setIsOpen(false)
    if (onSelect) onSelect()
    navigate(`/store?search=${encodeURIComponent(query.trim())}`)
  }

  function handleSelectProduct(slug) {
    setIsOpen(false)
    setQuery('')
    if (onSelect) onSelect()
    navigate(`/product/${slug}`)
  }

  return (
    <div ref={searchRef} className={`relative w-full ${className}`}>
      <form onSubmit={handleSubmit} className="relative flex items-center">
        <div className="pointer-events-none absolute left-3.5 text-neutral-400">
          <Search className="h-4 w-4" />
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
          className="w-full rounded-xl border border-black/10 bg-white py-2.5 pl-10 pr-10 text-xs font-medium shadow-sm transition placeholder:text-neutral-400 focus:border-[#0b7e74] focus:outline-none focus:ring-2 focus:ring-[#0b7e74]/20 dark:border-white/10 dark:bg-neutral-950 dark:text-white dark:focus:border-[#0b7e74]"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setIsOpen(false)
            }}
            className="absolute right-3 text-neutral-400 hover:text-neutral-600 dark:hover:text-white cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </form>

      {/* QUICK RESULTS DROPDOWN */}
      {isOpen && query.trim() && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-black/10 bg-white shadow-xl dark:border-white/10 dark:bg-neutral-900">
          {results.length > 0 ? (
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {results.map((product) => {
                const itemsList = Array.isArray(product.items) ? product.items : []
                const isGroup = product.productType === 'group' || itemsList.length > 1
                let minP = product.priceMmk || product.price || 0
                let maxP = product.priceMmk || product.price || 0

                if (isGroup && itemsList.length > 0) {
                  const prices = itemsList.map((i) => Number(i.priceMmk || i.price || 0))
                  minP = Math.min(...prices)
                  maxP = Math.max(...prices)
                }

                const isRange = isGroup && minP < maxP
                const statusDetails = getProductStatusDetails(product.status, product.stock)

                return (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => handleSelectProduct(product.slug)}
                    className="flex w-full items-center justify-between p-3 text-left transition hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-gradient-to-br ${product.gradient || 'from-[#0fa697] to-[#ff655b]'}`}
                      >
                        <ProductImage
                          image={product.image}
                          name={product.name}
                          className="h-full w-full object-cover"
                          fallbackClassName="text-xs font-black text-white"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="text-xs font-bold text-black dark:text-white truncate">
                          {product.name}
                        </p>
                        <p className="text-[10px] text-neutral-400 truncate">
                          {product.tag || 'Digital'} • {product.type || 'Key'} • {product.region || 'Global'}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0 ml-2">
                      <p className="text-xs font-bold font-mono text-black dark:text-white">
                        {isRange
                          ? formatPriceRange(minP, maxP)
                          : formatCurrency(minP)}
                      </p>
                      <span className={`inline-block rounded-md px-1.5 py-0.5 text-[9px] font-semibold ${statusDetails.badgeClass}`}>
                        {statusDetails.label}
                      </span>
                    </div>
                  </button>
                )
              })}

              <button
                type="button"
                onClick={handleSubmit}
                className="w-full cursor-pointer bg-neutral-50 px-4 py-2 text-center text-xs font-bold text-[#0b7e74] transition hover:bg-neutral-100 dark:bg-neutral-950 dark:hover:bg-neutral-800 flex items-center justify-center gap-1"
              >
                <span>View all results for "{query}" in Store</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <div className="p-5 text-center">
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-300">
                No products found matching "{query}"
              </p>
              <button
                type="button"
                onClick={handleSubmit}
                className="mt-1 text-xs font-bold text-[#0b7e74] hover:underline cursor-pointer"
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
