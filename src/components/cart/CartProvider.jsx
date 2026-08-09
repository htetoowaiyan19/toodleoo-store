import { useCallback, useMemo, useState } from 'react'
import { CartContext } from '../../utils/cartContext'

export function CartProvider({ children }) {
  const [items, setItems] = useState([])

  const addToCart = useCallback((product, quantity = 1, selectedItem = null) => {
    setItems((currentItems) => {
      const activeItem = selectedItem || product.items?.[0] || null
      const itemId = activeItem?.id || product.itemId || product.id
      const cartItemId = `${product.id}-${itemId}`
      const priceMmk = activeItem
        ? Number(activeItem.priceMmk !== undefined ? activeItem.priceMmk : activeItem.price || 0)
        : Number(product.priceMmk || product.price || 0)

      const existingItem = currentItems.find((item) => item.cartItemId === cartItemId)

      if (!existingItem) {
        return [
          ...currentItems,
          {
            ...product,
            id: itemId,
            itemId,
            productId: product.id,
            cartItemId,
            selectedVariant: activeItem
              ? { id: activeItem.id, name: activeItem.name, priceMmk }
              : null,
            variantName: activeItem?.name || '',
            priceMmk,
            price: priceMmk,
            basePriceMmk: priceMmk,
            quantity,
          },
        ]
      }

      return currentItems.map((item) =>
        item.cartItemId === cartItemId
          ? { ...item, quantity: item.quantity + quantity }
          : item,
      )
    })
  }, [])

  const removeFromCart = useCallback((cartItemId) => {
    setItems((currentItems) =>
      currentItems.filter((item) => (item.cartItemId || item.id) !== cartItemId),
    )
  }, [])

  const updateQuantity = useCallback(
    (cartItemId, quantity) => {
      if (quantity <= 0) {
        removeFromCart(cartItemId)
        return
      }

      setItems((currentItems) =>
        currentItems.map((item) =>
          (item.cartItemId || item.id) === cartItemId ? { ...item, quantity } : item,
        ),
      )
    },
    [removeFromCart],
  )

  const value = useMemo(() => {
    const subtotal = items.reduce(
      (total, item) => total + (item.priceMmk || item.price || 0) * item.quantity,
      0,
    )
    const count = items.reduce((total, item) => total + item.quantity, 0)

    return {
      addToCart,
      count,
      items,
      removeFromCart,
      savings: 0,
      subtotal,
      clearCart: () => setItems([]),
      updateQuantity,
    }
  }, [addToCart, items, removeFromCart, updateQuantity])

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}
