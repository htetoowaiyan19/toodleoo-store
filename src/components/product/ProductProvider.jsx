import { useEffect, useMemo, useState, useCallback } from 'react'
import { supabase } from '../../supabase'
import { products as fallbackProducts } from '../../data/products'
import { ProductContext } from '../../utils/productContext'
import { getExchangeRateSettings, syncAutoExchangeRate } from '../../services/storeService'

function normalizeProduct(data, exchangeRate = 4500) {
  const childItems = Array.isArray(data.items) ? data.items : []
  const isGroup = data.product_type === 'group' || childItems.length > 1
  const firstItem = childItems[0]

  const firstUsd = Number(firstItem?.price_usd !== undefined && firstItem?.price_usd !== 0
    ? firstItem.price_usd
    : data.price_usd !== undefined && data.price_usd !== 0
    ? data.price_usd
    : (firstItem?.price_mmk || data.price_mmk || 0) / exchangeRate)

  const basePriceUsd = Math.max(0, Number(firstUsd.toFixed(2)))
  const basePriceMmk = Math.round(basePriceUsd * exchangeRate)
  const baseStock = Number(firstItem?.stock !== undefined ? firstItem.stock : data.stock || 0)
  const baseStatus = firstItem?.status || data.status || (baseStock > 0 ? 'instock' : 'out-of-stock')

  const items = isGroup
    ? childItems.map((i, idx) => {
        const itemUsdRaw = Number(i.price_usd !== undefined && i.price_usd !== 0 ? i.price_usd : (i.price_mmk || 0) / exchangeRate)
        const itemUsd = Math.max(0, Number(itemUsdRaw.toFixed(2)))
        const itemMmk = Math.round(itemUsd * exchangeRate)
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

function normalizeFallback(product, exchangeRate = 4500) {
  const basePriceUsd = product.price || 5.0
  const basePriceMmk = Math.round(basePriceUsd * exchangeRate)

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
  const [lastSyncedAt, setLastSyncedAt] = useState(null)
  const [products, setProducts] = useState(() =>
    fallbackProducts.map((p) => normalizeFallback(p, 4500)),
  )
  const [loading, setLoading] = useState(true)

  const loadExchangeRate = useCallback(async () => {
    const settings = await getExchangeRateSettings()
    if (settings.rate) setExchangeRate(settings.rate)
    if (settings.lastSyncedAt) setLastSyncedAt(settings.lastSyncedAt)
    return settings.rate || 4500
  }, [])

  const loadProducts = useCallback(async (activeRate = exchangeRate) => {
    const { data, error } = await supabase
      .from('products')
      .select('*, items(*)')
      .order('updated_at', { ascending: false })

    if (!error && Array.isArray(data)) {
      setProducts(data.map((p) => normalizeProduct(p, activeRate)))
    }
    setLoading(false)
  }, [exchangeRate])

  useEffect(() => {
    let active = true

    async function init() {
      const rate = await loadExchangeRate()
      if (active) {
        await loadProducts(rate)
        // Background Market Rate Auto-Sync
        syncAutoExchangeRate().then((newRate) => {
          if (active && newRate && newRate !== rate) {
            setExchangeRate(newRate)
            loadProducts(newRate)
          }
        })
      }
    }

    init()

    const channelProd = supabase
      .channel('products-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => loadProducts(exchangeRate))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'items' }, () => loadProducts(exchangeRate))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'store_settings' }, async () => {
        const freshRate = await loadExchangeRate()
        loadProducts(freshRate)
      })
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channelProd)
    }
  }, [exchangeRate, loadExchangeRate, loadProducts])

  const convertUsdToMmk = useCallback((usd) => {
    return Math.round(Number(usd || 0) * exchangeRate)
  }, [exchangeRate])

  const value = useMemo(() => {
    const categories = ['All', ...new Set(products.map((item) => item.category))]
    const platforms = ['All', ...new Set(products.map((item) => item.platform))]

    const refreshProducts = async () => {
      const rate = await loadExchangeRate()
      await loadProducts(rate)
    }

    const triggerMarketRateSync = async () => {
      const freshRate = await syncAutoExchangeRate()
      if (freshRate) {
        setExchangeRate(freshRate)
        setLastSyncedAt(new Date().toISOString())
        await loadProducts(freshRate)
      }
      return freshRate
    }

    return {
      categories,
      loading,
      platforms,
      products,
      exchangeRate,
      lastSyncedAt,
      convertUsdToMmk,
      refreshProducts,
      triggerMarketRateSync,
    }
  }, [loading, products, exchangeRate, lastSyncedAt, convertUsdToMmk, loadExchangeRate, loadProducts])

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}
