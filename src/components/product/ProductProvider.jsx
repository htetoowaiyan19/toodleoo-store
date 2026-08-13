import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { supabase } from '../../supabase'
import { products as fallbackProducts } from '../../data/products'
import { ProductContext } from '../../utils/productContext'
import { getExchangeRateSettings, syncAutoExchangeRate, updateFeeSettings } from '../../services/storeService'




import {
  formatCurrency as globalFormatCurrency,
  formatUsdToMmk as globalFormatUsdToMmk,
  formatPriceRange as globalFormatPriceRange,
} from '../../utils/format'

function parsePriceUsd(usdVal, exchangeRate = 4500) {
  let usd = Number(usdVal || 0)

  // Repeatedly scale down if usd > 1000 to fix compounded pricing artifacts
  if (usd > 1000) {
    while (usd > 1000) {
      usd = usd / exchangeRate
    }
    return Math.max(0, Number(usd.toFixed(2)))
  }

  return Math.max(0, Number(usd.toFixed(2)))
}

function normalizeProduct(data, exchangeRate = 4500, taxPercent = 0, serviceFeePercent = 0) {
  const childItems = Array.isArray(data.items) ? data.items : []
  const isGroup = data.product_type === 'group' || childItems.length > 1
  const firstItem = childItems[0]

  const firstUsd = parsePriceUsd(
    firstItem?.price_usd !== undefined ? firstItem.price_usd : data.price_usd,
    exchangeRate,
  )

  const feeMultiplier = 1 + (Number(taxPercent || 0) + Number(serviceFeePercent || 0)) / 100
  const basePriceUsd = firstUsd
  const basePriceMmk = Math.round(basePriceUsd * exchangeRate * feeMultiplier)
  const baseStock = Number(firstItem?.stock !== undefined ? firstItem.stock : data.stock || 0)
  const baseStatus = firstItem?.status || data.status || (baseStock > 0 ? 'instock' : 'out-of-stock')

  const items = isGroup
    ? childItems.map((i, idx) => {
        const itemUsd = parsePriceUsd(i.price_usd, exchangeRate)
        const itemMmk = Math.round(itemUsd * exchangeRate * feeMultiplier)
        return {
          id: i.id || `item-${idx}`,
          name: i.name || `Option ${idx + 1}`,
          priceUsd: itemUsd,
          priceMmk: itemMmk,
          stock: Number(i.stock || 0),
          status: i.status || (i.stock > 0 ? 'instock' : 'out-of-stock'),
        }
      })
    : [
        {
          id: firstItem?.id || `item-${data.id}`,
          name: '',
          priceUsd: basePriceUsd,
          priceMmk: basePriceMmk,
          stock: baseStock,
          status: baseStatus,
        },
      ]

  return {
    id: data.id,
    badge: data.badge || null,
    category: data.category || 'Digital',
    description: data.description || '',
    deliveryType: data.delivery_type || 'manual_text',
    featured: Boolean(data.featured),
    gradient: data.gradient || 'from-[#0fa697] to-[#ff655b]',
    image: data.image || data.name?.slice(0, 2)?.toUpperCase() || 'TD',
    includes: data.includes || data.tags || [],
    items,
    itemId: firstItem?.id || null,
    name: data.name || 'Untitled product',
    platform: data.platform || 'Digital',
    price: basePriceMmk,
    priceUsd: basePriceUsd,
    priceMmk: basePriceMmk,
    productType: isGroup ? 'group' : 'single',
    rating: data.rating || 5,
    reviews: data.reviews || 0,
    slug: data.slug || data.id,
    status: baseStatus,
    stock: baseStock,
    tags: data.tags || [],
    requiredFields: data.required_fields || data.requiredFields || [],
  }
}

function normalizeFallback(product, exchangeRate = 4500, taxPercent = 0, serviceFeePercent = 0) {
  const feeMultiplier = 1 + (Number(taxPercent || 0) + Number(serviceFeePercent || 0)) / 100
  const basePriceUsd = product.price || 5.0
  const basePriceMmk = Math.round(basePriceUsd * exchangeRate * feeMultiplier)

  return {
    ...product,
    priceUsd: basePriceUsd,
    priceMmk: basePriceMmk,
    basePriceMmk: basePriceMmk,
    price: basePriceMmk,
    stock: 99,
    status: 'instock',
    productType: 'single',
    itemId: `fallback-item-${product.id}`,
    items: [
      {
        id: `fallback-item-${product.id}`,
        name: '',
        priceUsd: basePriceUsd,
        priceMmk: basePriceMmk,
        stock: 99,
        status: 'instock',
      },
    ],
    tags: [product.category, product.platform],
  }
}

export function ProductProvider({ children }) {
  const [exchangeRate, setExchangeRate] = useState(4500)
  const [taxPercent, setTaxPercent] = useState(0)
  const [serviceFeePercent, setServiceFeePercent] = useState(0)
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [products, setProducts] = useState(() =>
    fallbackProducts.map((p) => normalizeFallback(p, 4500, 0, 0)),
  )
  const [loading, setLoading] = useState(true)

  const settingsRef = useRef({ rate: 4500, taxPercent: 0, serviceFeePercent: 0 })

  const loadExchangeRate = useCallback(async () => {
    const settings = await getExchangeRateSettings()
    const rate = settings.rate || 4500
    const tax = settings.taxPercent || 0
    const fee = settings.serviceFeePercent || 0

    setExchangeRate(rate)
    setTaxPercent(tax)
    setServiceFeePercent(fee)
    if (settings.lastSyncedAt) setLastSyncedAt(settings.lastSyncedAt)

    settingsRef.current = { rate, taxPercent: tax, serviceFeePercent: fee }
    return settingsRef.current
  }, [])

  const fetchAndNormalizeProducts = useCallback(async (activeRate, activeTax, activeFee) => {
    const rateToUse = activeRate ?? settingsRef.current.rate
    const taxToUse = activeTax ?? settingsRef.current.taxPercent
    const feeToUse = activeFee ?? settingsRef.current.serviceFeePercent

    const { data, error } = await supabase
      .from('products')
      .select('*, items(*)')
      .order('updated_at', { ascending: false })

    if (!error && Array.isArray(data)) {
      setProducts(data.map((p) => normalizeProduct(p, rateToUse, taxToUse, feeToUse)))
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    let active = true

    async function init() {
      const settings = await loadExchangeRate()
      if (active) {
        await fetchAndNormalizeProducts(settings.rate, settings.taxPercent, settings.serviceFeePercent)
      }
    }

    init()

    const channelProd = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchAndNormalizeProducts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => {
        fetchAndNormalizeProducts()
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, async () => {
        const fresh = await loadExchangeRate()
        fetchAndNormalizeProducts(fresh.rate, fresh.taxPercent, fresh.serviceFeePercent)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channelProd)
    }
  }, [loadExchangeRate, fetchAndNormalizeProducts])

  const convertUsdToMmk = useCallback((usd) => {
    const feeMultiplier = 1 + (Number(taxPercent || 0) + Number(serviceFeePercent || 0)) / 100
    return Math.round(Number(usd || 0) * exchangeRate * feeMultiplier)
  }, [exchangeRate, taxPercent, serviceFeePercent])


  const formatCurrency = useCallback((mmkValue) => {
    return globalFormatCurrency(mmkValue)
  }, [])

  const formatUsdToMmk = useCallback((usdValue) => {
    return globalFormatUsdToMmk(usdValue, exchangeRate, taxPercent, serviceFeePercent)
  }, [exchangeRate, taxPercent, serviceFeePercent])

  const formatPriceRange = useCallback((minMmk, maxMmk) => {
    return globalFormatPriceRange(minMmk, maxMmk)
  }, [])

  const maxProductPrice = useMemo(() => {
    if (!products || products.length === 0) return 50000
    const allPrices = products.flatMap((p) => {
      const itemsList = Array.isArray(p.items) ? p.items : []
      if (itemsList.length > 0) {
        return itemsList.map((i) => Number(i.priceMmk || i.price || 0))
      }
      return [Number(p.priceMmk || p.price || 0)]
    })
    return Math.max(...allPrices, 50000)
  }, [products])

  const updateFees = useCallback(async ({ taxPercent: newTax, serviceFeePercent: newFee }) => {
    const updated = await updateFeeSettings({ taxPercent: newTax, serviceFeePercent: newFee })
    setTaxPercent(updated.taxPercent)
    setServiceFeePercent(updated.serviceFeePercent)
    await loadProducts(exchangeRate, updated.taxPercent, updated.serviceFeePercent)
    return updated
  }, [exchangeRate, loadProducts])

  const value = useMemo(() => {
    const categories = ['All', ...new Set(products.map((item) => item.category))]
    const platforms = ['All', ...new Set(products.map((item) => item.platform))]

    const refreshProducts = async () => {
      const settings = await loadExchangeRate()
      await fetchAndNormalizeProducts(settings.rate, settings.taxPercent, settings.serviceFeePercent)
    }

    const triggerMarketRateSync = async () => {
      const freshRate = await syncAutoExchangeRate()
      if (freshRate) {
        setExchangeRate(freshRate)
        setLastSyncedAt(new Date().toISOString())
        await fetchAndNormalizeProducts(freshRate, taxPercent, serviceFeePercent)
      }
      return freshRate
    }

    return {
      categories,
      loading,
      platforms,
      products,
      maxProductPrice,
      exchangeRate,
      taxPercent,
      serviceFeePercent,
      lastSyncedAt,
      convertUsdToMmk,
      formatCurrency,
      formatUsdToMmk,
      formatPriceRange,
      refreshProducts,
      triggerMarketRateSync,
      updateFees,
    }
  }, [loading, products, maxProductPrice, exchangeRate, taxPercent, serviceFeePercent, lastSyncedAt, convertUsdToMmk, formatCurrency, formatUsdToMmk, formatPriceRange, loadExchangeRate, fetchAndNormalizeProducts, updateFees])


  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}
