import { supabase } from '../supabase'

function camelizePayment(row) {
  return {
    ...row,
    adminWalletAccount: row.admin_wallet_account,
    amountMmk: row.amount_mmk,
    createdAt: row.created_at,
    orderId: row.order_id,
    receiptImagePath: row.receipt_image_path,
    reviewedAt: row.reviewed_at,
    reviewedBy: row.reviewed_by,
    reviewNote: row.review_note,
    userEmail: row.user_email,
    userId: row.user_id,
    customerDeleted: Boolean(row.customer_deleted),
    adminDeleted: Boolean(row.admin_deleted),
  }
}

function camelizeOrder(row) {
  return {
    ...row,
    createdAt: row.created_at,
    deliveryMessage: row.delivery_message,
    deliveredAt: row.delivered_at,
    deliveredBy: row.delivered_by,
    paymentSource: row.payment_source,
    totalMmk: row.total_mmk,
    userEmail: row.user_email,
    userId: row.user_id,
    customerDeleted: Boolean(row.customer_deleted),
    adminDeleted: Boolean(row.admin_deleted),
    isSubmitted: Boolean(row.is_submitted),
    receiptImagePath: row.receipt_image_path,
  }
}


function camelizeWalletTransaction(row) {
  return {
    ...row,
    amountMmk: row.amount_mmk,
    createdAt: row.created_at,
    createdBy: row.created_by,
    orderId: row.order_id,
    paymentId: row.payment_id,
    userId: row.user_id,
  }
}

function camelizeNotification(row) {
  return {
    ...row,
    createdAt: row.created_at,
    userId: row.user_id,
  }
}

function normalizeCollection(collectionName, rows) {
  if (collectionName === 'payments') return rows.map(camelizePayment)
  if (collectionName === 'orders') return rows.map(camelizeOrder)
  if (collectionName === 'wallet_transactions') {
    return rows.map(camelizeWalletTransaction)
  }
  if (collectionName === 'notifications') return rows.map(camelizeNotification)
  return rows
}

export function subscribeUserCollection(collectionName, userId, callback) {
  if (!userId) return () => {}

  async function loadRows() {
    const { data, error } = await supabase
      .from(collectionName)
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (!error) callback(normalizeCollection(collectionName, data || []))
  }


  loadRows()

  const channel = supabase
    .channel(`${collectionName}:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: collectionName,
        filter: `user_id=eq.${userId}`,
      },
      loadRows,
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}

export function subscribeAdminCollection(collectionName, callback) {
  async function loadRows() {
    const { data, error } = await supabase
      .from(collectionName)
      .select('*')
      .order('created_at', { ascending: false })

    if (!error) callback(normalizeCollection(collectionName, data || []))
  }

  loadRows()

  const channel = supabase
    .channel(`admin:${collectionName}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: collectionName },
      loadRows,
    )
    .subscribe()

  return () => supabase.removeChannel(channel)
}


// Client-side HTML5 Canvas Image Compressor (Reduces 10MB camera photos to ~40KB-80KB to save free storage quota)
function compressImage(file, maxWidth = 1000, quality = 0.75) {
  return new Promise((resolve) => {
    if (!file || !file.type?.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target.result
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file)
              return
            }
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          },
          'image/jpeg',
          quality,
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = () => resolve(file)
  })
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

export async function uploadReceipt({ file, paymentId, userId }) {
  if (!file) return ''

  // Compress image before uploading to conserve free Supabase storage tier
  const processedFile = await compressImage(file)

  try {
    const filePath = `${userId}/${paymentId}-${processedFile.name || 'receipt.jpg'}`
    const { error } = await supabase.storage
      .from('receipts')
      .upload(filePath, processedFile, {
        contentType: processedFile.type || 'image/jpeg',
        upsert: true,
      })

    if (!error) return filePath
  } catch (storageErr) {
    console.warn('Supabase Storage upload fallback to Base64 Data URL:', storageErr)
  }

  return await fileToBase64(processedFile)
}

export async function getReceiptUrl(path) {
  if (!path) return ''
  if (path.startsWith('data:') || path.startsWith('http')) return path

  try {
    const { data, error } = await supabase.storage
      .from('receipts')
      .createSignedUrl(path, 60 * 10)

    if (!error && data?.signedUrl) return data.signedUrl
  } catch {
    // ignore fallback
  }

  const { data: publicUrlData } = supabase.storage
    .from('receipts')
    .getPublicUrl(path)

  return publicUrlData?.publicUrl || path
}

export async function createManualPayment({
  amountMmk,
  orderId = null,
  purpose,
  receiptFile,
  user,
}) {
  const paymentId = crypto.randomUUID()

  let receiptImagePath = ''
  if (receiptFile) {
    receiptImagePath = await uploadReceipt({
      file: receiptFile,
      paymentId,
      userId: user.id,
    })
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .insert({
      id: paymentId,
      admin_wallet_account: 'Primary admin wallet',
      amount_mmk: Number(amountMmk),
      order_id: orderId,
      purpose,
      receipt_image_path: receiptImagePath,
      status: 'submitted',
      user_email: user.email,
      user_id: user.id,
    })
    .select()
    .single()

  if (error) throw error

  if (orderId) {
    await supabase
      .from('orders')
      .update({
        status: 'submitted',
        is_submitted: true,
        receipt_image_path: receiptImagePath,
      })
      .eq('id', orderId)
  }

  await supabase.from('notifications').insert({
    audience: 'admin',
    message: `${user.email} submitted a ${purpose.replace('_', ' ')} receipt.`,
    read: false,
    title: 'Payment awaiting review',
    type: 'payment_submitted',
    user_id: user.id,
  })

  return payment.id
}

export async function createOrderFromCart({ items, paymentSource, couponCode = null }) {
  const normalizedItems = items.map((item) => ({
    id: item.itemId || item.id,
    itemId: item.itemId || item.id,
    productId: item.productId || item.id,
    name: item.name,
    priceMmk: Math.round(Number(item.priceMmk || item.price || 0)),
    quantity: Math.max(1, Number(item.quantity || 1)),
    slug: item.slug || item.id,
    variantName: item.variantName || '',
    variantId: item.selectedVariant?.id || item.itemId || '',
  }))

  const { data, error } = await supabase.rpc('create_order_from_cart', {
    cart_items: normalizedItems,
    payment_source_input: paymentSource,
    coupon_code_input: couponCode || null,
  })

  if (error) throw error

  return data
}



export async function reviewPayment({ payment, reviewNote = '', status }) {
  const { error } = await supabase.rpc('review_manual_payment', {
    payment_id_input: payment.id,
    review_note_input: reviewNote,
    status_input: status,
  })

  if (error) throw error
}

export async function deliverOrder({ deliveryMessage, orderId }) {
  // 1. Auto-approve attached payment if not already approved when admin delivers
  const { data: payments } = await supabase
    .from('payments')
    .select('id, status')
    .eq('order_id', orderId)

  if (payments && payments.length > 0) {
    for (const p of payments) {
      if (p.status !== 'approved') {
        await supabase
          .from('payments')
          .update({ status: 'approved', reviewed_at: new Date().toISOString() })
          .eq('id', p.id)
      }
    }
  }

  // 2. Mark order as delivered with delivery message
  const { error } = await supabase
    .from('orders')
    .update({
      status: 'delivered',
      delivery_message: deliveryMessage,
      delivered_at: new Date().toISOString(),
    })
    .eq('id', orderId)

  if (error) {
    const { error: rpcError } = await supabase.rpc('deliver_manual_order', {
      delivery_message_input: deliveryMessage,
      order_id_input: orderId,
    })
    if (rpcError) throw rpcError
  }

  // 3. Send delivered notification to customer
  const { data: order } = await supabase
    .from('orders')
    .select('user_id')
    .eq('id', orderId)
    .single()

  if (order?.user_id) {
    await supabase.from('notifications').insert({
      audience: 'customer',
      message: `Your order #${orderId.slice(0, 8)} has been approved and delivered! Click to view code.`,
      read: false,
      title: 'Order Delivered 🎉',
      type: 'order_delivered',
      user_id: order.user_id,
    })
  }
}
export async function getExchangeRateSettings() {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('key, value')

    if (error || !data) return { rate: 4500, taxPercent: 0, serviceFeePercent: 0, lastSyncedAt: null }

    const rateRow = data.find((r) => r.key === 'usd_to_mmk_rate')
    const syncRow = data.find((r) => r.key === 'last_auto_sync_at')
    const taxRow = data.find((r) => r.key === 'tax_percent')
    const feeRow = data.find((r) => r.key === 'service_fee_percent')

    return {
      rate: rateRow && rateRow.value ? Number(rateRow.value) : 4500,
      taxPercent: taxRow && taxRow.value ? Number(taxRow.value) : 0,
      serviceFeePercent: feeRow && feeRow.value ? Number(feeRow.value) : 0,
      lastSyncedAt: syncRow ? syncRow.value : null,
    }
  } catch (err) {
    console.warn('Error fetching exchange rate settings:', err)
    return { rate: 4500, taxPercent: 0, serviceFeePercent: 0, lastSyncedAt: null }
  }
}

export async function updateExchangeRateSettings(newRate) {
  const rateStr = String(Math.round(Number(newRate || 4500)))
  const { error } = await supabase
    .from('store_settings')
    .upsert([
      { key: 'usd_to_mmk_rate', value: rateStr, updated_at: new Date().toISOString() },
      { key: 'last_auto_sync_at', value: new Date().toISOString(), updated_at: new Date().toISOString() },
    ])

  if (error) throw error
  return Number(rateStr)
}

export async function updateFeeSettings({ taxPercent, serviceFeePercent }) {
  const taxStr = String(Math.max(0, Number(taxPercent || 0)))
  const feeStr = String(Math.max(0, Number(serviceFeePercent || 0)))

  const { error } = await supabase
    .from('store_settings')
    .upsert([
      { key: 'tax_percent', value: taxStr, updated_at: new Date().toISOString() },
      { key: 'service_fee_percent', value: feeStr, updated_at: new Date().toISOString() },
    ])

  if (error) throw error
  return { taxPercent: Number(taxStr), serviceFeePercent: Number(feeStr) }
}


export async function fetchLiveMarketExchangeRate() {
  // 1. Try CoinGecko USDT/MMK ticker
  try {
    const cgRes = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=mmk')
    if (cgRes.ok) {
      const cgData = await cgRes.json()
      if (cgData && cgData.tether && cgData.tether.mmk) {
        const rate = Math.round(Number(cgData.tether.mmk))
        if (rate > 3000) return rate
      }
    }
  } catch (err) {
    // Silent catch
  }

  // 2. Try Open Exchange Rates fallback with market factor adjustment (~4300-4500 MMK)
  try {
    const erRes = await fetch('https://open.er-api.com/v6/latest/USD')
    if (erRes.ok) {
      const erData = await erRes.json()
      if (erData && erData.rates && erData.rates.MMK) {
        const rawRate = Number(erData.rates.MMK)
        // If official CBM rate ~2100 MMK returned, scale to real market trading rate (~4400 MMK)
        if (rawRate > 1500 && rawRate < 3000) {
          return Math.round(rawRate * 2.1)
        } else if (rawRate >= 3000) {
          return Math.round(rawRate)
        }
      }
    }
  } catch (err) {
    // Silent catch
  }

  return 4500
}


export async function syncAutoExchangeRate() {
  try {
    const marketRate = await fetchLiveMarketExchangeRate()
    await updateExchangeRateSettings(marketRate)
    return marketRate
  } catch (err) {
    console.warn('Failed to auto sync exchange rate:', err)
    return 4500
  }
}

function sanitizeUsd(val, exchangeRate = 4500) {
  let usd = Number(val || 0)
  while (usd > 1000) {
    usd = usd / exchangeRate
  }
  return Math.max(0, Number(usd.toFixed(2)))
}

export async function saveProduct(product) {
  const isGroup = product.productType === 'group' || (Array.isArray(product.items) && product.items.length > 1)

  const singlePriceUsd = sanitizeUsd(
    product.priceUsd !== undefined ? product.priceUsd : product.price_usd || product.price || 0,
    product.exchangeRate || 4500,
  )
  const singlePriceMmk = Math.round(singlePriceUsd * (product.exchangeRate || 4500))

  const productPayload = {
    badge: product.badge || null,
    category: product.category || 'Digital',
    delivery_type: 'manual_text',
    description: product.description || '',
    featured: Boolean(product.featured),
    gradient: product.gradient || 'from-[#0fa697] to-[#ff655b]',
    image: product.image || '',
    name: product.name,
    platform: product.platform || 'Manual',
    product_type: isGroup ? 'group' : 'single',
    slug: product.slug,
    tags:
      typeof product.tags === 'string'
        ? product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : product.tags || [],
    required_fields: product.requiredFields || [],
    price_usd: singlePriceUsd,
  }



  let productId = product.id

  if (productId) {
    const { error: prodErr } = await supabase
      .from('products')
      .update(productPayload)
      .eq('id', productId)
    if (prodErr) throw prodErr
  } else {
    const { data: newProd, error: insertErr } = await supabase
      .from('products')
      .insert([productPayload])
      .select('id')
      .single()
    if (insertErr) throw insertErr
    productId = newProd.id
  }

  // Handle Items Table Upserting / Syncing
  if (!isGroup) {
    const singleStock = Number(product.stock || 0)
    const singleStatus = product.status || (singleStock > 0 ? 'instock' : 'out-of-stock')

    const { data: existingItems } = await supabase
      .from('items')
      .select('id')
      .eq('product_id', productId)

    if (existingItems && existingItems.length > 0) {
      const firstItemId = existingItems[0].id
      await supabase
        .from('items')
        .update({
          name: '',
          price_usd: singlePriceUsd,
          stock: singleStock,
          status: singleStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', firstItemId)

      if (existingItems.length > 1) {
        const idsToDelete = existingItems.slice(1).map((i) => i.id)
        await supabase.from('items').delete().in('id', idsToDelete)
      }
    } else {
      await supabase.from('items').insert([
        {
          product_id: productId,
          name: '',
          price_usd: singlePriceUsd,
          stock: singleStock,
          status: singleStatus,
        },
      ])
    }
  } else {
    const rawItems = Array.isArray(product.items) ? product.items : []
    const currentItemIds = rawItems.filter((i) => i.id).map((i) => i.id)

    const { data: existingItems } = await supabase
      .from('items')
      .select('id')
      .eq('product_id', productId)

    if (existingItems) {
      const idsToDelete = existingItems
        .filter((ei) => !currentItemIds.includes(ei.id))
        .map((ei) => ei.id)

      if (idsToDelete.length > 0) {
        await supabase.from('items').delete().in('id', idsToDelete)
      }
    }

    for (const it of rawItems) {
      const itemPriceUsd = sanitizeUsd(
        it.priceUsd !== undefined ? it.priceUsd : it.price_usd || it.price || 0,
        product.exchangeRate || 4500,
      )

      const itemStock = Number(it.stock || 0)
      const itemStatus = it.status || (itemStock > 0 ? 'instock' : 'out-of-stock')

      if (it.id && typeof it.id === 'string' && it.id.length === 36) {
        await supabase
          .from('items')
          .update({
            name: it.name || 'Option',
            price_usd: itemPriceUsd,
            stock: itemStock,
            status: itemStatus,
            updated_at: new Date().toISOString(),
          })
          .eq('id', it.id)
      } else {
        await supabase.from('items').insert([
          {
            product_id: productId,
            name: it.name || 'Option',
            price_usd: itemPriceUsd,
            stock: itemStock,
            status: itemStatus,
          },
        ])
      }
    }
  }


  return productId
}

export async function deleteProduct(productId) {
  const { error } = await supabase.from('products').delete().eq('id', productId)
  if (error) throw error
}


export async function downloadReceipt(pathOrUrl, filename = 'receipt.jpg') {
  if (!pathOrUrl) return
  const url = await getReceiptUrl(pathOrUrl)
  if (!url) return

  try {
    const response = await fetch(url)
    const blob = await response.blob()
    const blobUrl = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.href = blobUrl
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(blobUrl)
  } catch (err) {
    console.warn('Direct blob download failed, fallback to window.open:', err)
    window.open(url, '_blank')
  }
}

export async function cancelPendingOrder(orderId) {
  const { error: orderErr } = await supabase
    .from('orders')
    .update({ status: 'cancelled', customer_deleted: true })
    .eq('id', orderId)

  if (orderErr) throw orderErr

  await supabase
    .from('payments')
    .update({ status: 'cancelled' })
    .eq('order_id', orderId)
}

export async function deleteCustomerOrder() {
  throw new Error('Transaction deletion is disabled to preserve audit history.')
}

export async function deleteCustomerPayment() {
  throw new Error('Transaction deletion is disabled to preserve audit history.')
}

export async function deleteCustomerWalletTransaction() {
  throw new Error('Transaction deletion is disabled to preserve audit history.')
}

export async function deleteAdminOrder() {
  throw new Error('Transaction deletion is disabled to preserve audit history.')
}

export async function deleteAdminPayment() {
  throw new Error('Transaction deletion is disabled to preserve audit history.')
}

export async function deleteOrder(orderId) {
  return deleteCustomerOrder(orderId)
}

export async function deleteNotification(notificationId) {
  const { error } = await supabase
    .from('notifications')
    .delete()
    .eq('id', notificationId)

  if (error) throw error
}

export async function clearUserNotifications(userId) {
  const { error } = await supabase.from('notifications').delete().eq('user_id', userId)
  if (error) throw error
}

export async function getAdminWalletAccount() {
  const { data, error } = await supabase
    .from('admin_wallet_accounts')
    .select('*')
    .eq('is_active', true)
    .limit(1)
    .maybeSingle()

  if (error) throw error

  return data
    ? { displayName: data.display_name, phoneNumber: data.phone_number }
    : { displayName: 'Admin wallet', phoneNumber: '+95 9 000 000 000' }
}

function camelizeCoupon(row) {
  return {
    ...row,
    createdAt: row.created_at,
    discountPercent: Number(row.discount_percent || 0),
    discountType: row.discount_type,
    isActive: Boolean(row.is_active),
    productIds: row.product_ids || [],
    targetValue: row.target_value || '',
    maxUses: row.max_uses !== null && row.max_uses !== undefined ? Number(row.max_uses) : null,
    currentUses: Number(row.current_uses || 0),
    expiresAt: row.expires_at || null,
  }
}

export async function fetchCoupons() {
  const { data, error } = await supabase
    .from('coupons')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.warn('Coupons fetch error:', error.message)
    return []
  }
  return (data || []).map(camelizeCoupon)
}

export function subscribeCoupons(callback) {
  async function load() {
    const data = await fetchCoupons()
    callback(data)
  }

  load()

  const channel = supabase
    .channel('public:coupons')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'coupons' },
      load,
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}

export async function createCoupon({
  code,
  discountType,
  discountPercent,
  targetValue = '',
  productIds = [],
  maxUses = null,
  expiresAt = null,
}) {
  const cleanCode = String(code).trim().toUpperCase()
  const { data, error } = await supabase
    .from('coupons')
    .insert([
      {
        code: cleanCode,
        discount_type: discountType,
        discount_percent: Number(discountPercent),
        target_value: targetValue,
        product_ids: productIds,
        max_uses: maxUses ? Number(maxUses) : null,
        expires_at: expiresAt || null,
        is_active: true,
      },
    ])
    .select()
    .single()

  if (error) throw error
  return camelizeCoupon(data)
}

export async function toggleCouponStatus(couponId, isActive) {
  const { error } = await supabase
    .from('coupons')
    .update({ is_active: isActive })
    .eq('id', couponId)

  if (error) throw error
}

export async function deleteCoupon(couponId) {
  const { error } = await supabase
    .from('coupons')
    .delete()
    .eq('id', couponId)

  if (error) throw error
}

export async function validateCouponCode(code, items = []) {
  const normalizedItems = items.map((item) => ({
    id: item.id,
    name: item.name,
    priceMmk: Math.round(Number(item.priceMmk || item.price || 0)),
    quantity: Math.max(1, Number(item.quantity || 1)),
    slug: item.slug || item.id,
    variantName: item.variantName || '',
    variantId: item.selectedVariant?.id || '',
  }))

  const { data, error } = await supabase.rpc('validate_coupon', {
    p_code: code,
    p_cart_items: normalizedItems,
  })

  if (error) throw error
  return data
}

export async function rejectAndRefundOrder(orderId, reason = '') {
  const { error } = await supabase.rpc('reject_and_refund_order', {
    order_id_input: orderId,
    reason_input: reason || '',
  })

  if (error) throw error
}


