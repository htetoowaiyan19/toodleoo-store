import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../supabase'
import { products as fallbackProducts } from '../../data/products'
import { ProductContext } from '../../utils/productContext'

function normalizeProduct(data) {
  const childItems = Array.isArray(data.items) ? data.items : []
  const isGroup = data.product_type === 'group' || childItems.length > 1
  const firstItem = childItems[0]

  const basePrice = Number(firstItem?.price_mmk !== undefined ? firstItem.price_mmk : data.price_mmk || 0)
  const baseStock = Number(firstItem?.stock !== undefined ? firstItem.stock : data.stock || 0)
  const baseStatus = firstItem?.status || data.status || (baseStock > 0 ? 'instock' : 'out-of-stock')

  const items = isGroup
    ? childItems.map((i, idx) => ({
        id: i.id || `item-${idx}`,
        name: i.name || `Option ${idx + 1}`,
        priceMmk: Number(i.price_mmk || 0),
        stock: Number(i.stock || 0),
        status: i.status || (i.stock > 0 ? 'instock' : 'out-of-stock'),
      }))
    : [
        {
          id: firstItem?.id || `item-${data.id}`,
          name: '',
          priceMmk: basePrice,
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
    price: basePrice,
    priceMmk: basePrice,
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


function normalizeFallback(product) {
  const basePrice = product.price * 2000
  return {
    ...product,
    basePriceMmk: basePrice,
    priceMmk: basePrice,
    price: basePrice,
    stock: 99,
    status: 'instock',
    productType: 'single',
    itemId: `fallback-item-${product.id}`,
    items: [
      {
        id: `fallback-item-${product.id}`,
        name: '',
        priceMmk: basePrice,
        stock: 99,
        status: 'instock',
      },
    ],
    tags: [product.category, product.platform],
  }
}

export function ProductProvider({ children }) {
  const [products, setProducts] = useState(fallbackProducts.map(normalizeFallback))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function loadProducts() {
      const { data, error } = await supabase
        .from('products')
        .select('*, items(*)')
        .order('updated_at', { ascending: false })

      if (!active) return
      if (!error && Array.isArray(data)) setProducts(data.map(normalizeProduct))
      setLoading(false)
    }

    loadProducts()

    const channelProd = supabase
      .channel('products-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'products' },
        loadProducts,
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'items' },
        loadProducts,
      )
      .subscribe()

    return () => {
      active = false
      supabase.removeChannel(channelProd)
    }
  }, [])

  const value = useMemo(() => {
    const categories = ['All', ...new Set(products.map((item) => item.category))]
    const platforms = ['All', ...new Set(products.map((item) => item.platform))]

    const refreshProducts = async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, items(*)')
        .order('updated_at', { ascending: false })

      if (!error && Array.isArray(data)) setProducts(data.map(normalizeProduct))
    }

    return {
      categories,
      loading,
      platforms,
      products,
      refreshProducts,
    }
  }, [loading, products])

  return <ProductContext.Provider value={value}>{children}</ProductContext.Provider>
}
