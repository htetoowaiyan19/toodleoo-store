import { useMemo, useState } from 'react'
import { Route, Routes, Navigate } from 'react-router'
import { AuthProvider } from './components/auth/AuthProvider'
import { ThemeProvider } from './components/theme/ThemeProvider'
import { ProtectedRoute } from './components/auth/ProtectedRoute'
import { CartDrawer } from './components/cart/CartDrawer'
import { CartProvider } from './components/cart/CartProvider'
import { Layout } from './components/layout/Layout'
import { ProductProvider } from './components/product/ProductProvider'
import { useProducts } from './utils/useProducts'
import { AccountPage } from './pages/AccountPage'
import { AdminOrdersPage } from './pages/AdminOrdersPage'
import { AdminPage } from './pages/AdminPage'
import { AdminPaymentsPage } from './pages/AdminPaymentsPage'
import { AdminProductsPage } from './pages/AdminProductsPage'
import { CheckoutPage } from './pages/CheckoutPage'
import { HomePage } from './pages/HomePage'
import { LoginPage } from './pages/LoginPage'
import { OrdersPage } from './pages/OrdersPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrderSuccessPage } from './pages/OrderSuccessPage'

import { PaymentPage } from './pages/PaymentPage'
import { ProductPage } from './pages/ProductPage'
import { StorePage } from './pages/StorePage'
import { WalletPage } from './pages/WalletPage'
import { CustomOrderPage } from './pages/CustomOrderPage'
import { SubscriptionsPage } from './pages/SubscriptionsPage'
import { SettingsPage } from './pages/SettingsPage'

function AppRoutes() {
  const [isCartOpen, setIsCartOpen] = useState(false)
  const { products } = useProducts()
  const featuredProducts = useMemo(
    () => products.filter((product) => product.featured),
    [products],
  )

  return (
    <CartProvider>
      <Layout onCartOpen={() => setIsCartOpen(true)}>
        <Routes>
          <Route
            path="/"
            element={<HomePage featuredProducts={featuredProducts} />}
          />
          <Route path="/store" element={<StorePage />} />
          <Route path="/product/:slug" element={<ProductPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/custom-order"
            element={
              <ProtectedRoute>
                <CustomOrderPage />
              </ProtectedRoute>
            }
          />
          <Route path="/subscriptions" element={<SubscriptionsPage />} />
          <Route path="/membership" element={<SubscriptionsPage />} />
          <Route
            path="/account"
            element={
              <ProtectedRoute>
                <AccountPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/wallet"
            element={
              <ProtectedRoute>
                <WalletPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={<Navigate to="/account?tab=orders" replace />}
          />
          <Route
            path="/orders/:id"
            element={
              <ProtectedRoute>
                <OrderDetailPage />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payment"
            element={
              <ProtectedRoute>
                <PaymentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <CheckoutPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/order-success"
            element={
              <ProtectedRoute>
                <OrderSuccessPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/products"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage defaultTab="products" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/custom-orders"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage defaultTab="custom-orders" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/discounts"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage defaultTab="discounts" />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/payments"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage defaultTab="orders" />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/orders"
            element={
              <ProtectedRoute adminOnly>
                <AdminPage defaultTab="orders" />
              </ProtectedRoute>
            }
          />
        </Routes>
      </Layout>
      <CartDrawer isOpen={isCartOpen} onClose={() => setIsCartOpen(false)} />
    </CartProvider>
  )
}


import { CouponProvider } from './components/coupon/CouponProvider'
import { LanguageProvider } from './components/language/LanguageProvider'

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AuthProvider>
          <ProductProvider>
            <CouponProvider>
              <AppRoutes />
            </CouponProvider>
          </ProductProvider>
        </AuthProvider>
      </LanguageProvider>
    </ThemeProvider>
  )
}

export default App
