import { useState } from 'react'
import { deleteProduct } from '../services/storeService'
import { useProducts } from '../utils/useProducts'
import { formatCurrency, formatPriceRange } from '../utils/format'
import { getProductStatusDetails } from '../utils/productStatus'
import { useTranslation } from '../utils/useTranslation'
import { DeleteConfirmModal } from '../components/common/DeleteConfirmModal'
import { ProductImage } from '../components/common/ProductImage'
import { ProductFormModal } from '../components/admin/ProductFormModal'
import { Plus, Search, Edit3, Trash2, Tag, Layers, Package, Key, Globe, X } from 'lucide-react'

export function AdminProductsPage() {
  const { t } = useTranslation()
  const { products, refreshProducts, formatCurrency, formatPriceRange } = useProducts()
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
    (p.tag && p.tag.toLowerCase().includes(search.toLowerCase())) ||
    (p.type && p.type.toLowerCase().includes(search.toLowerCase())) ||
    (p.region && p.region.toLowerCase().includes(search.toLowerCase())) ||
    p.slug.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <section className="space-y-6">
      {/* TOP HEADER TITLE & CREATE NEW BUTTON */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <p className="font-bold text-[#0b7e74]">{t('admin.subtitle')}</p>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black">{t('admin.productsTab.title')}</h1>
          <p className="mt-1 text-xs sm:text-sm text-neutral-600 dark:text-neutral-400">
            {t('admin.productsTab.subtitle')}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCreateNew}
          className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#0b7e74] px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-[#096860]"
        >
          <Plus className="h-4 w-4" />
          <span>{t('admin.productsTab.createNew')}</span>
        </button>
      </div>

      {feedback.message && (
        <div
          className={`flex items-center justify-between rounded-lg p-3 text-xs font-bold ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20'
          }`}
        >
          <span>{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback({ message: '', type: '' })}
            className="cursor-pointer p-1 opacity-75 hover:opacity-100"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* SEARCH BAR */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder={t('admin.productsTab.searchPlaceholder')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-black/10 bg-white pl-9 pr-4 py-2 text-xs font-semibold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
          />
        </div>
        <p className="text-xs font-semibold text-neutral-500">
          {t('admin.productsTab.showingCount', { shown: filteredProducts.length, total: products.length })}
        </p>
      </div>

      {/* PRODUCTS TABLE */}
      <div className="overflow-hidden rounded-xl border border-black/10 bg-white shadow-sm dark:border-white/10 dark:bg-neutral-900">
        {filteredProducts.length === 0 ? (
          <div className="p-10 text-center text-neutral-500">
            <Package className="mx-auto h-8 w-8 text-neutral-400" />
            <p className="mt-2 text-sm font-bold">{t('admin.productsTab.noProducts')}</p>
            <p className="mt-1 text-xs">{t('admin.productsTab.createHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-black/10 bg-neutral-50 font-bold uppercase tracking-wider text-neutral-500 dark:border-white/10 dark:bg-neutral-800/50">
                <tr>
                  <th className="p-2.5">{t('admin.productsTab.productNameSlug')}</th>
                  <th className="p-2.5">{t('admin.productsTab.classification')}</th>
                  <th className="p-2.5">{t('admin.productsTab.productType')}</th>
                  <th className="p-2.5">{t('admin.productsTab.sellingPrice')}</th>
                  <th className="p-2.5">{t('admin.productsTab.stockStatus')}</th>
                  <th className="p-2.5 text-right">{t('admin.productsTab.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {filteredProducts.map((product) => {
                  const isGroup = product.productType === 'group' || (product.items && product.items.length > 1)
                  const itemsList = Array.isArray(product.items) ? product.items : []

                  let minMmk = product.priceMmk || product.price || 0
                  let maxMmk = product.priceMmk || product.price || 0
                  let minUsd = product.priceUsd || 0
                  let maxUsd = product.priceUsd || 0
                  let totalStock = product.stock || 0

                  if (isGroup && itemsList.length > 0) {
                    const mmkPrices = itemsList.map((i) => Number(i.priceMmk || i.price || 0))
                    const usdPrices = itemsList.map((i) => Number(i.priceUsd || 0))
                    minMmk = Math.min(...mmkPrices)
                    maxMmk = Math.max(...mmkPrices)
                    minUsd = Math.min(...usdPrices)
                    maxUsd = Math.max(...usdPrices)
                    totalStock = itemsList.reduce((sum, i) => sum + Number(i.stock || 0), 0)
                  }

                  const isRange = isGroup && minMmk < maxMmk
                  const isUsdRange = isGroup && minUsd < maxUsd

                  const statusDetails = getProductStatusDetails(product.status, totalStock)

                  return (
                    <tr
                      key={product.id}
                      className="transition hover:bg-black/5 dark:hover:bg-white/5"
                    >
                      <td className="p-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#0b7e74]/10">
                            <ProductImage
                              image={product.image}
                              name={product.name}
                              className="h-full w-full object-cover"
                              fallbackClassName="text-xs font-bold text-[#0b7e74]"
                            />
                          </div>
                          <div>
                            <div className="font-bold text-xs sm:text-sm text-black dark:text-white">
                              {product.name}
                            </div>
                            <div className="text-[10px] text-neutral-400 font-mono">
                              /{product.slug}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-2.5">
                        <div className="flex flex-wrap items-center gap-1">
                          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 px-1.5 py-0.5 text-[10px] font-bold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                            <Tag className="h-2.5 w-2.5" /> {product.tag || 'Game'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-[#0b7e74]/10 px-1.5 py-0.5 text-[10px] font-bold text-[#0b7e74] dark:bg-[#0b7e74]/20 dark:text-[#67dccf]">
                            <Key className="h-2.5 w-2.5" /> {product.type || 'Key'}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                            <Globe className="h-2.5 w-2.5" /> {product.region || 'Global'}
                          </span>
                        </div>
                      </td>

                      <td className="p-2.5">
                        {isGroup ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-purple-500/10 px-2 py-0.5 text-[10px] font-bold text-purple-600 dark:text-purple-400">
                            <Layers className="h-3 w-3" /> {t('admin.productsTab.variantGroup', { count: itemsList.length })}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-500/10 px-2 py-0.5 text-[10px] font-bold text-blue-600 dark:text-blue-400">
                            <Tag className="h-3 w-3" /> {t('admin.productsTab.singleProduct')}
                          </span>
                        )}
                      </td>

                      <td className="p-2.5 font-mono font-bold text-xs sm:text-sm text-emerald-600 dark:text-emerald-400">
                        <div className="flex flex-col">
                          <span>
                            {isRange ? formatPriceRange(minMmk, maxMmk) : formatCurrency(minMmk)}
                          </span>
                          <span className="text-[10px] font-normal text-neutral-400">
                            {isUsdRange
                              ? `$${minUsd.toFixed(2)} - $${maxUsd.toFixed(2)} USD`
                              : `$${minUsd.toFixed(2)} USD`}
                          </span>
                        </div>
                      </td>



                      <td className="p-2.5">
                        <div className="flex items-center gap-1">
                          <span
                            className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold ${statusDetails.badgeClass}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${statusDetails.dotClass}`} />
                            {statusDetails.label}
                          </span>
                        </div>
                        <p className="mt-0.5 text-[10px] font-medium text-neutral-500">
                          Stock: {totalStock} units
                        </p>
                      </td>

                      <td className="p-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleEdit(product)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#0b7e74]/10 px-2.5 py-1 text-xs font-bold text-[#0b7e74] transition hover:bg-[#0b7e74] hover:text-white cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" /> {t('admin.productsTab.edit')}
                          </button>

                          <button
                            type="button"
                            onClick={() => setDeleteTarget(product)}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2 py-1 text-xs font-bold text-red-500 transition hover:bg-red-500 hover:text-white cursor-pointer"
                            title={t('admin.productsTab.delete')}
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
        title={t('admin.productsTab.deleteTitle')}
        description={t('admin.productsTab.deleteMsg', { name: deleteTarget?.name || '' })}
        confirmText={t('admin.productsTab.delete')}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteTarget(null)}
      />
    </section>
  )
}
