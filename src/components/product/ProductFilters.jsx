import { useProducts } from '../../utils/useProducts'

export function ProductFilters({ filters, onChange, activeCount = 0 }) {
  const { categories = [], platforms = [], products = [] } = useProducts()

  // Calculate price boundaries dynamically
  const maxProductPrice = Math.max(
    ...products.map((p) => Number(p.priceMmk || p.price || 0)),
    50000
  )

  function handleReset() {
    onChange({
      category: 'All',
      platform: 'All',
      availability: 'All',
      minPrice: 0,
      maxPrice: maxProductPrice,
      search: '',
      sort: 'featured',
    })
  }

  function removeFilter(key, defaultValue) {
    onChange({ ...filters, [key]: defaultValue })
  }

  return (
    <aside className="space-y-6 rounded-2xl border border-black/10 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      {/* FILTER HEADER */}
      <div className="flex items-center justify-between border-b border-black/5 pb-4 dark:border-white/5">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black">Filters</h2>
          {activeCount > 0 && (
            <span className="rounded-full bg-[#0b7e74] px-2 py-0.5 text-xs font-bold text-white">
              {activeCount}
            </span>
          )}
        </div>

        {activeCount > 0 && (
          <button
            type="button"
            onClick={handleReset}
            className="cursor-pointer text-xs font-bold text-[#0b7e74] transition hover:underline"
          >
            Clear All
          </button>
        )}
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-black/5 pb-4 dark:border-white/5">
          {filters.search && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">
              "{filters.search}"
              <button
                type="button"
                onClick={() => removeFilter('search', '')}
                className="cursor-pointer font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                ✕
              </button>
            </span>
          )}
          {filters.category !== 'All' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">
              Category: {filters.category}
              <button
                type="button"
                onClick={() => removeFilter('category', 'All')}
                className="cursor-pointer font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                ✕
              </button>
            </span>
          )}
          {filters.platform !== 'All' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">
              Platform: {filters.platform}
              <button
                type="button"
                onClick={() => removeFilter('platform', 'All')}
                className="cursor-pointer font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                ✕
              </button>
            </span>
          )}
          {filters.availability !== 'All' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">
              Status: {filters.availability}
              <button
                type="button"
                onClick={() => removeFilter('availability', 'All')}
                className="cursor-pointer font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                ✕
              </button>
            </span>
          )}
          {(filters.minPrice > 0 || filters.maxPrice < maxProductPrice) && (
            <span className="inline-flex items-center gap-1 rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold dark:bg-neutral-800">
              Price Range
              <button
                type="button"
                onClick={() => onChange({ ...filters, minPrice: 0, maxPrice: maxProductPrice })}
                className="cursor-pointer font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}

      {/* SEARCH IN FILTER */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Search Keywords
        </label>
        <div className="relative mt-1.5">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder="Search catalog..."
            className="w-full rounded-xl border border-black/10 bg-white px-3.5 py-2 text-sm font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => removeFilter('search', '')}
              className="absolute right-3 top-2.5 text-xs font-bold text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* SORT BY */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Sort By
        </label>
        <select
          value={filters.sort}
          onChange={(e) => onChange({ ...filters, sort: e.target.value })}
          className="mt-1.5 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          <option value="featured">Featured First</option>
          <option value="newest">Newest Arrivals</option>
          <option value="price-low">Price: Low to High</option>
          <option value="price-high">Price: High to Low</option>
          <option value="rating">Highest Rated</option>
          <option value="name-asc">Alphabetical (A-Z)</option>
        </select>
      </div>

      {/* AVAILABILITY / STATUS */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Availability Status
        </label>
        <select
          value={filters.availability || 'All'}
          onChange={(e) => onChange({ ...filters, availability: e.target.value })}
          className="mt-1.5 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          <option value="All">All Items</option>
          <option value="instock">In Stock Only (Instant)</option>
          <option value="pre-order">Pre-Order Only</option>
        </select>

      </div>

      {/* CATEGORY FILTER */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Category
        </label>
        <select
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          className="mt-1.5 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'All' ? 'All Categories' : cat}
            </option>
          ))}
        </select>
      </div>

      {/* PLATFORM FILTER */}
      <div>
        <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
          Platform / Format
        </label>
        <select
          value={filters.platform}
          onChange={(e) => onChange({ ...filters, platform: e.target.value })}
          className="mt-1.5 w-full cursor-pointer rounded-xl border border-black/10 bg-white px-3 py-2 text-sm font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          {platforms.map((plat) => (
            <option key={plat} value={plat}>
              {plat === 'All' ? 'All Platforms' : plat}
            </option>
          ))}
        </select>
      </div>

      {/* PRICE RANGE FILTER */}
      <div>
        <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-neutral-500">
          <span>Max Price Filter</span>
          <span className="font-black text-black dark:text-white">
            {Number(filters.maxPrice || maxProductPrice).toLocaleString()} MMK
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={maxProductPrice}
          step="500"
          value={filters.maxPrice ?? maxProductPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="mt-3 w-full accent-[#0b7e74]"
        />
        <div className="mt-1 flex items-center justify-between text-[11px] font-semibold text-neutral-400">
          <span>0 MMK</span>
          <span>{maxProductPrice.toLocaleString()} MMK</span>
        </div>
      </div>
    </aside>
  )
}
