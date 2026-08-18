import { useProducts } from '../../utils/useProducts'
import { useTranslation } from '../../utils/useTranslation'
import { Tag, Key, Globe, Zap, X } from 'lucide-react'

export function ProductFilters({ filters, onChange, activeCount = 0 }) {
  const { tags = [], types = [], regions = [], maxProductPrice = 50000 } = useProducts()
  const { t } = useTranslation()

  function handleReset() {
    onChange({
      tag: 'All',
      type: 'All',
      region: 'All',
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
    <aside className="space-y-4 rounded-xl border border-black/10 bg-white p-4 sm:p-5 shadow-sm dark:border-white/10 dark:bg-neutral-900">
      {/* FILTER HEADER */}
      <div className="flex items-center justify-between border-b border-black/5 pb-3 dark:border-white/5">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-black">{t('common.filter')}</h2>
          {activeCount > 0 && (
            <span className="rounded-md bg-[#0b7e74] px-2 py-0.5 text-xs font-bold text-white">
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
            {t('store.resetFilters')}
          </button>
        )}
      </div>

      {/* ACTIVE FILTER CHIPS */}
      {activeCount > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-black/5 pb-3 dark:border-white/5">
          {filters.search && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold dark:bg-neutral-800">
              <span>"{filters.search}"</span>
              <button
                type="button"
                onClick={() => removeFilter('search', '')}
                className="cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                title="Remove search filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.tag && filters.tag !== 'All' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold dark:bg-neutral-800">
              <span>{t('store.category')}: {filters.tag}</span>
              <button
                type="button"
                onClick={() => removeFilter('tag', 'All')}
                className="cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                title="Remove tag filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.type && filters.type !== 'All' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold dark:bg-neutral-800">
              <span>{t('store.type')}: {filters.type}</span>
              <button
                type="button"
                onClick={() => removeFilter('type', 'All')}
                className="cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                title="Remove type filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.region && filters.region !== 'All' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold dark:bg-neutral-800">
              <span>{t('store.region')}: {filters.region}</span>
              <button
                type="button"
                onClick={() => removeFilter('region', 'All')}
                className="cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                title="Remove region filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
          {filters.availability !== 'All' && (
            <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-2 py-1 text-xs font-semibold dark:bg-neutral-800">
              <span>{t('common.status')}: {filters.availability}</span>
              <button
                type="button"
                onClick={() => removeFilter('availability', 'All')}
                className="cursor-pointer text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
                title="Remove status filter"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          )}
        </div>
      )}

      {/* SEARCH IN FILTER */}
      <div>
        <label className="block text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          {t('common.search')}
        </label>
        <div className="relative mt-1">
          <input
            type="text"
            value={filters.search}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
            placeholder={t('store.searchPlaceholder')}
            className="w-full rounded-lg border border-black/10 bg-white px-3 py-2 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
          />
          {filters.search && (
            <button
              type="button"
              onClick={() => removeFilter('search', '')}
              className="absolute right-2.5 top-2.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* PRODUCT TAG FILTER */}
      <div>
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          <Tag className="h-3 w-3" />
          <span>{t('store.category')}</span>
        </label>
        <select
          value={filters.tag || 'All'}
          onChange={(e) => onChange({ ...filters, tag: e.target.value })}
          className="mt-1 w-full cursor-pointer rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          {tags.map((tVal) => (
            <option key={tVal} value={tVal}>
              {tVal === 'All' ? t('store.allCategories') : tVal}
            </option>
          ))}
        </select>
      </div>

      {/* REDEMPTION TYPE FILTER */}
      <div>
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          <Key className="h-3 w-3" />
          <span>{t('store.type')}</span>
        </label>
        <select
          value={filters.type || 'All'}
          onChange={(e) => onChange({ ...filters, type: e.target.value })}
          className="mt-1 w-full cursor-pointer rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          {types.map((tp) => (
            <option key={tp} value={tp}>
              {tp === 'All' ? t('store.allTypes') : tp}
            </option>
          ))}
        </select>
      </div>

      {/* REGION FILTER */}
      <div>
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          <Globe className="h-3 w-3" />
          <span>{t('store.region')}</span>
        </label>
        <select
          value={filters.region || 'All'}
          onChange={(e) => onChange({ ...filters, region: e.target.value })}
          className="mt-1 w-full cursor-pointer rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          {regions.map((rg) => (
            <option key={rg} value={rg}>
              {rg === 'All' ? t('store.allRegions') : rg}
            </option>
          ))}
        </select>
      </div>

      {/* AVAILABILITY / STATUS */}
      <div>
        <label className="flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          <Zap className="h-3 w-3" />
          <span>{t('common.status')}</span>
        </label>
        <select
          value={filters.availability || 'All'}
          onChange={(e) => onChange({ ...filters, availability: e.target.value })}
          className="mt-1 w-full cursor-pointer rounded-lg border border-black/10 bg-white px-2.5 py-2 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
        >
          <option value="All">{t('common.all')}</option>
          <option value="instock">{t('product.inStock')}</option>
          <option value="pre-order">{t('product.preOrder')}</option>
        </select>
      </div>

      {/* PRICE RANGE FILTER */}
      <div>
        <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-neutral-500">
          <span>Max {t('common.total')}</span>
          <span className="font-black text-black dark:text-white">
            {Number(filters.maxPrice || maxProductPrice).toLocaleString()} {t('common.ks')}
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={maxProductPrice}
          step="500"
          value={filters.maxPrice ?? maxProductPrice}
          onChange={(e) => onChange({ ...filters, maxPrice: Number(e.target.value) })}
          className="mt-2 w-full accent-[#0b7e74]"
        />
        <div className="mt-1 flex items-center justify-between text-[10px] font-semibold text-neutral-400">
          <span>0 {t('common.ks')}</span>
          <span>{maxProductPrice.toLocaleString()} {t('common.ks')}</span>
        </div>
      </div>
    </aside>
  )
}


