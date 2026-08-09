import { useContext } from 'react'
import { ProductContext } from './productContext'

export function useProducts() {
  const value = useContext(ProductContext)

  if (!value) {
    throw new Error('useProducts must be used inside ProductProvider')
  }

  return value
}
