import { useState } from 'react'
import { deleteProduct } from '../services/storeService'
import { useProducts } from '../utils/useProducts'
import { formatCurrency, formatPriceRange } from '../utils/format'
import { getProductStatusDetails } from '../utils/productStatus'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'
import { ProductImage } from '../components/common/ProductImage'
import { ProductFormModal } from '../components/admin/ProductFormModal'
import { Plus, Search, Edit3, Trash2, Tag, Layers, Package } from 'lucide-react'

export function AdminProductsPage() {
  const { products, refreshProducts } = useProducts()
  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [feedback, setFeedback] = useState({ message: '', type: '' })

  function handleCreateNew() {
    setEditingProduct(null)
    setIsModalOpen(true)
  }

  function handleEdit(product) {
    setEditingProduct(product)
    setIsModalOpen(true)
  }

  async function handleSaved() {
    if (refreshProducts) await refreshProducts()
    setFeedback({ message: 'Product saved successfully!', type: 'success' })
  }

  async function handleDeleteConfirm() {
    if (!deleteTarget) return
    setIsDeleting(true)
    setFeedback({ message: '', type: '' })

    try {
      await deleteProduct(deleteTarget.id)
      if (refreshProducts) await refreshProducts()
      setFeedback({ message: `Product "${deleteTarget.name}" deleted successfully.`, type: 'success' })
      setDeleteTarget(null)
    } catch (error) {
      setFeedback({ message: error.message || 'Failed to delete product.', type: 'error' })
    } finally {
      setIsDeleting(false)
    }
  }


  const filteredProducts = products.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.category.toLowerCase().includes(search.toLowerCase()) ||
    p.platform.toLowerCase().includes(search.toLowerCase()) ||
    p.slug.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <section className="space-y-6">
      {/* TOP HEADER TITLE & CREATE NEW BUTTON */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold text-[#0b7e74]">Admin Operations Hub</p>
          <h1 className="mt-1 text-3xl font-black">Product & Inventory Manager</h1>
          <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
            Manage single item products and group variant tiers in your store catalog.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-[#0b7e74] px-5 py-3 text-xs font-black text-white shadow-lg transition hover:bg-[#096860] hover:shadow-xl"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Product</span>
        </button>
      </div>

      {feedback.message && (
        <div
          className={`flex items-center justify-between rounded-2xl p-4 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback({ message: '', type: '' })}
            className="cursor-pointer font-bold opacity-75 hover:opacity-100"
          >
            ✕
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by product name, slug, category, or platform..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-2xl border border-black/10 bg-white pl-10 pr-4 py-2.5 text-xs font-medium outline-none transition focus:border-[#0b7e74] focus:ring-2 focus:ring-[#0b7e74]/20 dark:border-white/10 dark:bg-neutral-900"
          />
        </div>
        <p className="text-xs font-bold text-neutral-500">
          Showing {filteredProducts.length} of {products.length} Products
        </p>
      </div>

      {/* CATALOG TABLE */}
      <div className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-neutral-900">
        {filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-neutral-500">
            <Package className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-2 text-sm font-bold">No products found matching your search</p>
            <p className="mt-1 text-xs">Click "Create New Product" to add items to your catalog.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:bg-neutral-800/50">
                <tr>
                  <th className="p-3">Product Name & Slug</th>
                  <th className="p-3">Category & Platform</th>
                  <th className="p-3">Product Type</th>
                  <th className="p-3">Selling Price (MMK)</th>
                  <th className="p-3">Stock & Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredProducts.map((product) => {
                  const isGroup = product.productType === 'group' || (product.items && product.items.length > 1)
                  const itemsList = Array.isArray(product.items) ? product.items : []

                  let minP = product.priceMmk || product.price || 0
                  let maxP = product.priceMmk || product.price || 0
                  let totalStock = product.stock || 0

                  if (isGroup && itemsList.length > 0) {
                    const prices = itemsList.map((i) => Number(i.priceMmk || i.price || 0))
                    minP = Math.min(...prices)
                    maxP = Math.max(...prices)
                    totalStock = itemsList.reduce((sum, i) => sum + Number(i.stock || 0), 0)
                  }

                  const isRange = isGroup && minP < maxP
                  const statusDetails = getProductStatusDetails(product.status, totalStock)

                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          <div className="relative grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#0b7e74]/10">
                            <ProductImage
                              image={product.image}
                              name={product.name}
                              className="h-full w-full object-cover"
                              fallbackClassName="text-xs font-black text-[#0b7e74]"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-black dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              /{product.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3">
                        <div className="font-bold">{product.category}</div>
                        <div className="text-[10px] text-neutral-400">{product.platform}</div>
                      </td>

                      <td className="p-3">
                        {isGroup ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/10 px-2.5 py-1 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            <Layers className="h-3 w-3" /> Group ({itemsList.length} Options)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/10 px-2.5 py-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            <Tag className="h-3 w-3" /> Single Product
                          </span>
                        )}
                      </td>

                      <td className="p-3 font-mono font-black text-sm text-emerald-600 dark:text-emerald-400">
                        {isRange ? formatPriceRange(minP, maxP) : formatCurrency(minP)}
                      </td>

                      <td className="p-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusDetails.badgeClass}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dotClass}`} />
                            {statusDetails.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-medium text-neutral-500">
                          Total Stock: {totalStock} units
                        </p>
                      </td>

                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="inline-flex items-center gap-1 rounded-xl bg-[#0b7e74]/10 px-3 py-1.5 text-xs font-bold text-[#0b7e74] transition hover:bg-[#0b7e74] hover:text-white cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> Edit
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(product)}
                            className="inline-flex items-center gap-1 rounded-xl bg-red-500/10 px-2.5 py-1.5 text-xs font-bold text-red-500 transition hover:bg-red-500 hover:text-white cursor-pointer"
                            title="Delete Product"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* POP-UP CREATION / EDITING MODAL */}
      <ProductFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        initialProduct={editingProduct}
        onSaved={handleSaved}
      />


      {/* DELETE CONFIRMATION MODAL */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Product & Items"
        description={`Are you sure you want to delete "${deleteTarget?.name}"? All associated items and options will be permanently removed.`}
        confirmText="Delete Product"
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  )
}
