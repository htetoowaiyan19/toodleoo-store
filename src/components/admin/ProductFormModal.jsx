import { useState, useEffect } from 'react'
import { X, Sparkles, Plus, Trash2, Tag, Layers, CheckCircle, FileText } from 'lucide-react'
import { saveProduct } from '../../services/storeService'
import { useProducts } from '../../utils/useProducts'
import { formatCurrency, formatUsd } from '../../utils/format'

const CATEGORY_OPTIONS = ['Streaming', 'Gaming', 'Software', 'AI Tools', 'Design', 'Digital', 'Gift Cards']
const PLATFORM_OPTIONS = ['Netflix', 'Spotify', 'YouTube', 'Steam', 'ChatGPT', 'Adobe', 'Manual', 'Direct']

const STATUS_OPTIONS = [
  { value: 'instock', label: 'In Stock (Instant)' },
  { value: 'pre-order', label: 'Pre-Order' },
  { value: 'out-of-stock', label: 'Out of Stock' },
]

const PRESET_REQUIRED_FIELDS = [
  { id: 'account_info', label: '👤 Account Info (Username/Email & Password)' },
  { id: 'uid_info', label: '🆔 UID Info' },
  { id: 'email_info', label: '📧 Email Info' },
  { id: 'name_info', label: '🏷️ Name Info' },
]

export function ProductFormModal({ isOpen, onClose, initialProduct = null, onSaved }) {
  const { categories, platforms, exchangeRate = 4500 } = useProducts()

  const [productType, setProductType] = useState('single')
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [category, setCategory] = useState('Digital')
  const [platform, setPlatform] = useState('Manual')
  const [description, setDescription] = useState('')
  const [image, setImage] = useState('')
  const [gradient, setGradient] = useState('from-[#0fa697] to-[#ff655b]')
  const [badge, setBadge] = useState('')
  const [tags, setTags] = useState('')
  const [featured, setFeatured] = useState(false)

  // Required Customer Inputs State
  const [requiredTags, setRequiredTags] = useState([])
  const [customFields, setCustomFields] = useState([])
  const [newCustomField, setNewCustomField] = useState('')

  // Single Item Fields (USD)
  const [singlePriceUsd, setSinglePriceUsd] = useState(5.0)
  const [singleStock, setSingleStock] = useState(99)
  const [singleStatus, setSingleStatus] = useState('instock')

  // Group Items Fields
  const [items, setItems] = useState([])
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (initialProduct) {
      const isGroup = initialProduct.productType === 'group' || (initialProduct.items && initialProduct.items.length > 1)
      setProductType(isGroup ? 'group' : 'single')
      setName(initialProduct.name || '')
      setSlug(initialProduct.slug || '')
      setCategory(initialProduct.category || 'Digital')
      setPlatform(initialProduct.platform || 'Manual')
      setDescription(initialProduct.description || '')
      setImage(initialProduct.image || '')
      setGradient(initialProduct.gradient || 'from-[#0fa697] to-[#ff655b]')
      setBadge(initialProduct.badge || '')
      setTags(Array.isArray(initialProduct.tags) ? initialProduct.tags.join(', ') : '')
      setFeatured(Boolean(initialProduct.featured))

      if (initialProduct.requiredFields && Array.isArray(initialProduct.requiredFields)) {
        const activePresets = []
        const activeCustoms = []
        initialProduct.requiredFields.forEach((rf) => {
          const id = typeof rf === 'string' ? rf : rf.id
          const label = typeof rf === 'string' ? rf : rf.label || rf.id
          if (['account_info', 'uid_info', 'email_info', 'name_info'].includes(id)) {
            activePresets.push(id)
          } else {
            activeCustoms.push(label)
          }
        })
        setRequiredTags(activePresets)
        setCustomFields(activeCustoms)
      } else {
        setRequiredTags([])
        setCustomFields([])
      }

      if (isGroup && Array.isArray(initialProduct.items) && initialProduct.items.length > 0) {
        setItems(
          initialProduct.items.map((i) => ({
            id: i.id,
            name: i.name || '',
            priceUsd: Number(i.priceUsd !== undefined ? i.priceUsd : i.price_usd || (i.priceMmk ? i.priceMmk / exchangeRate : 5.0)),
            stock: i.stock !== undefined ? i.stock : 99,
            status: i.status || 'instock',
          })),
        )
      } else {
        const firstItem = initialProduct.items?.[0]
        const usdVal = Number(
          firstItem?.priceUsd !== undefined && firstItem?.priceUsd !== 0
            ? firstItem.priceUsd
            : initialProduct.priceUsd !== undefined && initialProduct?.priceUsd !== 0
            ? initialProduct.priceUsd
            : (firstItem?.priceMmk || initialProduct.priceMmk || initialProduct.price || 0) / exchangeRate,
        )
        setSinglePriceUsd(Number(usdVal.toFixed(2)))
        setSingleStock(firstItem?.stock !== undefined ? firstItem.stock : initialProduct.stock || 0)
        setSingleStatus(firstItem?.status || initialProduct.status || 'instock')
        setItems([
          { name: '1 Month', priceUsd: 5.0, stock: 99, status: 'instock' },
          { name: '1 Year', priceUsd: 25.0, stock: 99, status: 'instock' },
        ])
      }
    } else {
      // Create Mode Defaults
      setProductType('single')
      setName('')
      setSlug('')
      setCategory('Digital')
      setPlatform('Manual')
      setDescription('')
      setImage('')
      setGradient('from-[#0fa697] to-[#ff655b]')
      setBadge('')
      setTags('')
      setFeatured(false)
      setRequiredTags([])
      setCustomFields([])
      setSinglePriceUsd(5.0)
      setSingleStock(99)
      setSingleStatus('instock')
      setItems([
        { name: 'Standard Pass', priceUsd: 5.0, stock: 99, status: 'instock' },
        { name: 'Premium Pass', priceUsd: 12.5, stock: 99, status: 'instock' },
      ])
    }
  }, [initialProduct, isOpen, exchangeRate])

  function handleNameChange(e) {
    const newName = e.target.value
    setName(newName)
    if (!initialProduct) {
      setSlug(
        newName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-+|-+$/g, ''),
      )
    }
  }

  function toggleRequiredTag(tagId) {
    setRequiredTags((prev) =>
      prev.includes(tagId) ? prev.filter((t) => t !== tagId) : [...prev, tagId],
    )
  }

  function handleAddCustomField() {
    const trimmed = newCustomField.trim()
    if (!trimmed) return
    if (!customFields.includes(trimmed)) {
      setCustomFields((prev) => [...prev, trimmed])
    }
    setNewCustomField('')
  }

  function handleRemoveCustomField(index) {
    setCustomFields((prev) => prev.filter((_, idx) => idx !== index))
  }

  function handleAddItem() {
    setItems((prev) => [
      ...prev,
      { name: `Option ${prev.length + 1}`, priceUsd: 5.0, stock: 99, status: 'instock' },
    ])
  }

  function handleRemoveItem(index) {
    setItems((prev) => prev.filter((_, idx) => idx !== index))
  }

  function handleItemChange(index, field, value) {
    setItems((prev) =>
      prev.map((it, idx) => (idx === index ? { ...it, [field]: value } : it)),
    )
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim() || !slug.trim()) {
      alert('Product name and SLUG are required.')
      return
    }

    setSubmitting(true)
    try {
      const finalRequiredFields = [
        ...PRESET_REQUIRED_FIELDS.filter((p) => requiredTags.includes(p.id)).map((p) => ({
          id: p.id,
          label:
            p.id === 'account_info'
              ? 'Account Info (Username/Email & Password)'
              : p.id === 'uid_info'
              ? 'Game UID / Player ID'
              : p.id === 'email_info'
              ? 'Account Email Address'
              : 'In-Game Name / Display Name',
        })),
        ...customFields.map((cf) => ({
          id: `custom_${cf.toLowerCase().replace(/[^a-z0-9]+/g, '_')}`,
          label: cf,
          isCustom: true,
        })),
      ]

      const payload = {
        id: initialProduct?.id || null,
        name,
        slug,
        category,
        platform,
        description,
        image,
        gradient,
        badge,
        tags,
        featured,
        productType,
        requiredFields: finalRequiredFields,
        exchangeRate,
        priceUsd: singlePriceUsd,
        stock: singleStock,
        status: singleStatus,
        items: productType === 'group' ? items.map((i) => ({ ...i, priceUsd: Number(i.priceUsd || 0) })) : [],
      }

      await saveProduct(payload)
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      alert(`Failed to save product: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-black/10 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between border-b border-black/10 pb-4 dark:border-white/10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-[#0b7e74]" />
            <h2 className="text-xl font-black">
              {initialProduct ? 'Edit Product & USD Pricing' : 'Create New Product (USD Base)'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          {/* PRODUCT TYPE SELECTION */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500 mb-2">
              Select Product Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setProductType('single')}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-bold transition cursor-pointer ${
                  productType === 'single'
                    ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74]'
                    : 'border-black/10 bg-neutral-50 text-neutral-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                <Tag className="h-4 w-4" />
                <span>Single Item Product</span>
              </button>

              <button
                type="button"
                onClick={() => setProductType('group')}
                className={`flex items-center justify-center gap-2 rounded-2xl border p-3.5 text-xs font-bold transition cursor-pointer ${
                  productType === 'group'
                    ? 'border-[#0b7e74] bg-[#0b7e74]/10 text-[#0b7e74]'
                    : 'border-black/10 bg-neutral-50 text-neutral-600 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300'
                }`}
              >
                <Layers className="h-4 w-4" />
                <span>Product Group (Multiple Options)</span>
              </button>
            </div>
          </div>

          {/* BASIC PRODUCT FIELDS */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Product Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Mobile Legends Diamonds"
                className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                SLUG (URL Identifier) <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="mobile-legends-diamonds"
                className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3 text-xs font-mono outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-2xl border border-black/10 bg-white p-3 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              >
                {CATEGORY_OPTIONS.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Platform / Provider
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="mt-1.5 w-full cursor-pointer rounded-2xl border border-black/10 bg-white p-3 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              >
                {PLATFORM_OPTIONS.map((plat) => (
                  <option key={plat} value={plat}>
                    {plat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
              Product Description
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detailed description of features, terms, and delivery instructions..."
              className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Image URL (Optional)
              </label>
              <input
                type="text"
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="https://example.com/image.png"
                className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-neutral-500">
                Tags (Comma separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g. 4k, ultra, instant"
                className="mt-1.5 w-full rounded-2xl border border-black/10 bg-white p-3 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-950"
              />
            </div>
          </div>

          {/* FEATURED PRODUCT TOGGLE */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="featured-toggle"
              checked={featured}
              onChange={(e) => setFeatured(e.target.checked)}
              className="h-4 w-4 accent-[#0b7e74]"
            />
            <label htmlFor="featured-toggle" className="text-xs font-bold cursor-pointer">
              Mark as Featured Product (Displayed on Home Hero)
            </label>
          </div>

          {/* REQUIRED CUSTOMER PROCESSING INPUT DATA SECTION */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-3 dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400 flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-[#0b7e74]" /> Required Customer Information (Processing Data)
              </h3>
            </div>
            <p className="text-[11px] text-neutral-500">
              Select standard info tags or add custom fields that customers must fill in at checkout before processing this product.
            </p>

            {/* PRESET TAG TOGGLES */}
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-1">
              {PRESET_REQUIRED_FIELDS.map((preset) => {
                const isSelected = requiredTags.includes(preset.id)
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => toggleRequiredTag(preset.id)}
                    className={`cursor-pointer flex items-center justify-center gap-1.5 rounded-xl border p-2.5 text-xs font-bold transition ${
                      isSelected
                        ? 'border-[#0b7e74] bg-[#0b7e74]/15 text-[#0b7e74]'
                        : 'border-black/10 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-300'
                    }`}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <CheckCircle className="h-3.5 w-3.5" />}
                  </button>
                )
              })}
            </div>

            {/* CUSTOM FIELDS LIST & ADDER */}
            <div className="pt-2 space-y-2">
              <label className="block text-[11px] font-bold uppercase text-neutral-500">
                Custom Required Input Fields
              </label>

              {customFields.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {customFields.map((cf, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-black/10 bg-white px-3 py-1 text-xs font-bold text-neutral-800 dark:border-white/10 dark:bg-neutral-900 dark:text-neutral-200"
                    >
                      <span>{cf}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveCustomField(idx)}
                        className="cursor-pointer text-neutral-400 hover:text-red-500"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Add custom required field (e.g. Server Region, Character ID)..."
                  value={newCustomField}
                  onChange={(e) => setNewCustomField(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddCustomField()
                    }
                  }}
                  className="flex-1 rounded-xl border border-black/10 bg-white p-2.5 text-xs font-medium outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                />
                <button
                  type="button"
                  onClick={handleAddCustomField}
                  className="cursor-pointer inline-flex items-center gap-1 rounded-xl bg-[#0b7e74] px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-[#09665e]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>
            </div>
          </div>

          {/* DYNAMIC ITEM / INVENTORY SECTION (USD PRICING) */}
          <div className="rounded-2xl border border-black/10 bg-neutral-50 p-4 space-y-4 dark:border-white/10 dark:bg-neutral-950">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase tracking-wider text-neutral-600 dark:text-neutral-400">
                {productType === 'single' ? 'Single Item Selling Price (USD) & Stock' : 'Group Options & USD Pricing'}
              </h3>
              <span className="text-[10px] font-bold text-neutral-400">
                Rate: 1 USD = {exchangeRate.toLocaleString()} MMK
              </span>
            </div>

            {productType === 'single' ? (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-neutral-500">
                    Price in USD ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={singlePriceUsd}
                    onChange={(e) => setSinglePriceUsd(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                    required
                  />
                  <p className="mt-1 text-[10px] font-bold text-[#0b7e74]">
                    ≈ {formatCurrency(Math.round(singlePriceUsd * exchangeRate))}
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500">
                    Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={singleStock}
                    onChange={(e) => setSingleStock(Number(e.target.value))}
                    className="mt-1.5 w-full rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-neutral-500">
                    Status
                  </label>
                  <select
                    value={singleStatus}
                    onChange={(e) => setSingleStatus(e.target.value)}
                    className="mt-1.5 w-full cursor-pointer rounded-xl border border-black/10 bg-white p-2.5 text-xs font-bold outline-none transition focus:border-[#0b7e74] dark:border-white/10 dark:bg-neutral-900"
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {items.map((it, idx) => (
                  <div
                    key={it.id || idx}
                    className="flex flex-col gap-3 rounded-xl border border-black/10 bg-white p-3 shadow-sm dark:border-white/10 dark:bg-neutral-900 sm:flex-row sm:items-center"
                  >
                    <div className="flex-1">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400">
                        Option Title / Duration
                      </label>
                      <input
                        type="text"
                        value={it.name}
                        onChange={(e) => handleItemChange(idx, 'name', e.target.value)}
                        placeholder="e.g. 1 Month Pass"
                        className="mt-1 w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-bold outline-none dark:border-white/10 dark:bg-neutral-950"
                        required
                      />
                    </div>

                    <div className="w-32">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400">
                        Price (USD $)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={it.priceUsd}
                        onChange={(e) => handleItemChange(idx, 'priceUsd', Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-bold outline-none dark:border-white/10 dark:bg-neutral-950"
                        required
                      />
                      <p className="mt-0.5 text-[9px] font-bold text-[#0b7e74]">
                        ≈ {formatCurrency(Math.round((it.priceUsd || 0) * exchangeRate))}
                      </p>
                    </div>

                    <div className="w-20">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400">
                        Stock
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={it.stock}
                        onChange={(e) => handleItemChange(idx, 'stock', Number(e.target.value))}
                        className="mt-1 w-full rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-bold outline-none dark:border-white/10 dark:bg-neutral-950"
                        required
                      />
                    </div>

                    <div className="w-28">
                      <label className="block text-[10px] font-bold uppercase text-neutral-400">
                        Status
                      </label>
                      <select
                        value={it.status}
                        onChange={(e) => handleItemChange(idx, 'status', e.target.value)}
                        className="mt-1 w-full cursor-pointer rounded-lg border border-black/10 px-2.5 py-1.5 text-xs font-bold outline-none dark:border-white/10 dark:bg-neutral-950"
                      >
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="mt-4 sm:mt-0 p-2 text-red-500 hover:bg-red-500/10 rounded-lg cursor-pointer transition"
                        title="Remove Option"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}

                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full cursor-pointer inline-flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-black/20 bg-white p-2.5 text-xs font-bold text-neutral-700 transition hover:bg-neutral-100 dark:border-white/20 dark:bg-neutral-900 dark:text-neutral-300"
                >
                  <Plus className="h-4 w-4 text-[#0b7e74]" /> Add Option Variant
                </button>
              </div>
            )}
          </div>

          {/* SUBMIT BUTTONS */}
          <div className="flex items-center justify-end gap-3 border-t border-black/10 pt-4 dark:border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-black/10 bg-white px-5 py-2.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 dark:border-white/10 dark:bg-neutral-800 dark:text-neutral-300 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-[#0b7e74] px-6 py-2.5 text-xs font-bold text-white shadow-lg transition hover:bg-[#09665e] active:scale-[0.98] disabled:opacity-50 cursor-pointer"
            >
              {submitting ? 'Saving Product...' : initialProduct ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
