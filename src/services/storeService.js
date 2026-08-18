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
    deliveryType: row.delivery_type || 'key',
    deliveryPayload: row.delivery_payload || {},
    safekeyId: row.safekey_id,
    isRevealed: Boolean(row.is_revealed),
    revealedAt: row.revealed_at,
    revealedBy: row.revealed_by,
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
  const parsedAmount = Number(row.amount_mmk ?? row.amount ?? 0)
  return {
    ...row,
    amount: parsedAmount,
    amountMmk: parsedAmount,
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

function camelizeCustomOrder(row) {
  return {
    ...row,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    userId: row.user_id,
    userEmail: row.user_email,
    productName: row.product_name,
    providerName: row.provider_name,
    orderType: row.order_type,
    accountInfo: row.account_info,
    targetRegion: row.target_region,
    productUrl: row.product_url,
    contactMethods: row.contact_methods,
    quotedPriceMmk: row.quoted_price_mmk,
    quotedPriceUsd: row.quoted_price_usd,
    adminNotes: row.admin_notes,
    rejectionReason: row.rejection_reason,
    quotedAt: row.quoted_at,
    paymentSource: row.payment_source,
    paymentId: row.payment_id,
    receiptImagePath: row.receipt_image_path,
    deliveryMessage: row.delivery_message,
    deliveryType: row.delivery_type || 'key',
    deliveryPayload: row.delivery_payload || {},
    safekeyId: row.safekey_id,
    isRevealed: Boolean(row.is_revealed),
    revealedAt: row.revealed_at,
    revealedBy: row.revealed_by,
    deliveredAt: row.delivered_at,
  }
}

function normalizeCollection(collectionName, rows) {
  if (collectionName === 'payments') return rows.map(camelizePayment)
  if (collectionName === 'orders') return rows.map(camelizeOrder)
  if (collectionName === 'custom_orders') return rows.map(camelizeCustomOrder)
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
  if (purpose === 'wallet_topup') {
    const { data: existingPending } = await supabase
      .from('payments')
      .select('id')
      .eq('user_id', user.id)
      .eq('purpose', 'wallet_topup')
      .in('status', ['submitted', 'pending', 'uploading'])
      .maybeSingle()

    if (existingPending) {
      throw new Error(
        'You already have an active top-up request pending verification. Additional top-up requests are paused until your existing request is reviewed.',
      )
    }
  }

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
    if (purpose === 'custom_order') {
      await supabase
        .from('custom_orders')
        .update({
          status: 'submitted',
          payment_source: 'manual_payment',
          payment_id: payment.id,
          receipt_image_path: receiptImagePath,
          updated_at: new Date().toISOString(),
        })
        .eq('id', orderId)
    } else {
      await supabase
        .from('orders')
        .update({
          status: 'submitted',
          is_submitted: true,
          receipt_image_path: receiptImagePath,
        })
        .eq('id', orderId)
    }
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

export async function createOrderFromCart({ items, paymentSource, couponCode = null, contactMethods = [] }) {
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
    hasServicePlus: Boolean(item.hasServicePlus || item.has_service_plus || item.selectedVariant?.hasServicePlus || false),
    warrantyMonths: Number(item.warrantyMonths || item.warranty_months || item.selectedVariant?.warrantyMonths || 18),
  }))

  const { data, error } = await supabase.rpc('create_order_from_cart', {
    cart_items: normalizedItems,
    payment_source_input: paymentSource,
    coupon_code_input: couponCode || null,
    contact_methods_input: contactMethods || [],
  })

  if (error) throw error

  return data
}

/**
 * Unified Payment Processor
 * Takes all payment details in a single parameter object, processes the payment,
 * and returns { success: boolean, ... } to complete the payment flow.
 */
export async function processPayment({
  purpose = 'order_payment',
  paymentMethod = 'wallet',
  amountMmk,
  user,
  orderId = null,
  draftOrder = null,
  receiptFile = null,
}) {
  try {
    if (!user?.id) {
      throw new Error('Authentication is required to process payment.')
    }
    if (!amountMmk || Number(amountMmk) <= 0) {
      throw new Error('Invalid payment amount.')
    }

    // -------------------------------------------------------------
    // FLOW 1: WALLET PAYMENT
    // -------------------------------------------------------------
    if (paymentMethod === 'wallet') {
      if (purpose === 'custom_order') {
        if (!orderId) throw new Error('Custom order reference is missing.')
        await payCustomOrderWithWallet({
          customOrderId: orderId,
          amountMmk: Number(amountMmk),
        })
        return {
          success: true,
          orderId,
          method: 'wallet',
          amount: Number(amountMmk),
          type: 'custom_order',
        }
      }

      if (purpose === 'order_payment') {
        const items = draftOrder?.items || []
        const couponCode = draftOrder?.couponCode || draftOrder?.coupon?.code || null
        const contactMethods = draftOrder?.contactMethods || draftOrder?.contact_methods || []

        if (!items || items.length === 0) {
          throw new Error('No items found to process order.')
        }

        const newOrderId = await createOrderFromCart({
          items,
          paymentSource: 'wallet',
          couponCode,
          contactMethods,
        })

        return {
          success: true,
          orderId: newOrderId,
          method: 'wallet',
          amount: Number(amountMmk),
          type: 'order',
        }
      }

      throw new Error(`Unsupported purpose '${purpose}' for wallet payment.`)
    }

    // -------------------------------------------------------------
    // FLOW 2: MANUAL PAYMENT (KBZPay / WavePay / Mobile Banking)
    // -------------------------------------------------------------
    if (paymentMethod === 'manual_payment') {
      if (!receiptFile) {
        throw new Error('Please upload your payment transfer receipt screenshot.')
      }

      let finalOrderId = orderId

      // If store order from draft, insert real order record in DB
      if (purpose === 'order_payment') {
        if (orderId && orderId.startsWith('draft-') && draftOrder && Array.isArray(draftOrder.items)) {
          finalOrderId = await createOrderFromCart({
            items: draftOrder.items,
            paymentSource: 'manual_payment',
            couponCode: draftOrder.couponCode || null,
            contactMethods: draftOrder.contactMethods || draftOrder.contact_methods || [],
          })
        }
      }

      const paymentId = await createManualPayment({
        amountMmk: Number(amountMmk),
        orderId: finalOrderId,
        purpose,
        receiptFile,
        user,
      })

      return {
        success: true,
        orderId: finalOrderId,
        paymentId,
        method: 'manual_payment',
        amount: Number(amountMmk),
        type: purpose,
      }
    }

    throw new Error(`Unknown payment method: ${paymentMethod}`)
  } catch (err) {
    console.error('Payment processing failed:', err)
    return {
      success: false,
      error: err.message || 'Payment processing failed. Please try again.',
    }
  }
}





export async function reviewPayment({ payment, reviewNote = '', status }) {
  const { error } = await supabase.rpc('review_manual_payment', {
    payment_id_input: payment.id,
    review_note_input: reviewNote,
    status_input: status,
  })

  if (error) throw error
}

/**
 * Unified Secure Digital Delivery Processor
 * Delivers digital keys/credentials for Store Orders & Custom Orders with protection.
 */
export async function deliverSecureCredentials({
  orderId,
  orderType = 'order', // 'order' | 'custom_order'
  deliveryType = 'key', // 'key' | 'account' | 'activation_link' | 'text'
  deliveryMessage = '',
  deliveryPayload = {},
}) {
  const safekeyId = `KEY-${Math.random().toString(36).slice(2, 6).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`
  const table = orderType === 'custom_order' ? 'custom_orders' : 'orders'

  const updatePayload = {
    status: 'delivered',
    safekey_id: safekeyId,
    delivery_type: deliveryType,
    delivery_message: deliveryMessage,
    delivery_payload: deliveryPayload || {},
    is_revealed: false,
    delivered_at: new Date().toISOString(),
  }
  if (orderType === 'custom_order') {
    updatePayload.updated_at = new Date().toISOString()
  }

  // 1. Direct resilient update
  let updatedRow = null
  const { data, error: directError } = await supabase
    .from(table)
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single()

  if (directError) {
    // If extra columns like delivery_payload or safekey_id don't exist yet, fallback to basic update
    const basicPayload = {
      status: 'delivered',
      delivery_message: deliveryMessage,
      delivered_at: new Date().toISOString(),
    }
    if (orderType === 'custom_order') {
      basicPayload.updated_at = new Date().toISOString()
    }
    const { data: basicRow, error: basicError } = await supabase
      .from(table)
      .update(basicPayload)
      .eq('id', orderId)
      .select()
      .single()

    if (basicError) throw basicError
    updatedRow = basicRow
  } else {
    updatedRow = data
  }

  // 2. Auto-approve attached payment if pending
  if (orderType === 'order') {
    await supabase
      .from('payments')
      .update({ status: 'approved', reviewed_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .eq('status', 'submitted')
  }

  // 3. Send customer delivery notification
  try {
    const userId = updatedRow?.user_id || updatedRow?.userId
    if (userId) {
      await supabase.from('notifications').insert({
        audience: 'customer',
        message: `Your order #${orderId.slice(0, 8)} has been delivered! Click to view your credentials.`,
        read: false,
        title: 'Order Delivered',
        type: 'order_delivered',
        user_id: userId,
      })
    }
  } catch (notifErr) {
    console.warn('Failed to insert delivery notification:', notifErr)
  }

  return orderType === 'custom_order' ? camelizeCustomOrder(updatedRow) : camelizeOrder(updatedRow)
}

/**
 * Unified Digital Key Unlock & Reveal Function
 * Reveals digital credentials upon customer request.
 */
export async function claimAndRevealSafeKey({ orderId, orderType = 'order', user }) {
  const table = orderType === 'custom_order' ? 'custom_orders' : 'orders'
  const nowIso = new Date().toISOString()

  const updatePayload = {
    is_revealed: true,
    revealed_at: nowIso,
    revealed_by: user?.id || null,
  }
  if (orderType === 'custom_order') {
    updatePayload.updated_at = nowIso
  }

  const { data: updatedRow, error: directError } = await supabase
    .from(table)
    .update(updatePayload)
    .eq('id', orderId)
    .select()
    .single()

  if (directError) {
    // If is_revealed column is not in DB yet, fetch row and return with client-side isRevealed = true
    const { data: fallbackRow } = await supabase.from(table).select('*').eq('id', orderId).single()
    if (fallbackRow) {
      const camelized = orderType === 'custom_order' ? camelizeCustomOrder(fallbackRow) : camelizeOrder(fallbackRow)
      return { ...camelized, isRevealed: true, revealedAt: nowIso }
    }
    throw directError
  }

  return orderType === 'custom_order' ? camelizeCustomOrder(updatedRow) : camelizeOrder(updatedRow)
}

export const claimAndRevealCredentials = claimAndRevealSafeKey

export async function deliverOrder({ deliveryMessage, orderId }) {
  return deliverSecureCredentials({
    orderId,
    orderType: 'order',
    deliveryType: 'key',
    deliveryMessage,
  })
}

export async function getExchangeRateSettings() {
  try {
    const { data, error } = await supabase
      .from('store_settings')
      .select('key, value')

    if (error) {
      try {
        window.dispatchEvent(new CustomEvent('toodleoo:supabase-blocked'))
      } catch {}
      return { rate: 4500, taxPercent: 0, serviceFeePercent: 0, lastSyncedAt: null }
    }
    if (!data) return { rate: 4500, taxPercent: 0, serviceFeePercent: 0, lastSyncedAt: null }

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
    try {
      window.dispatchEvent(new CustomEvent('toodleoo:supabase-blocked'))
    } catch {}
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
    tag: product.tag || 'Game',
    type: product.type || 'Key',
    region: product.region || 'Global',
    delivery_type: 'manual_text',
    description: product.description || '',
    featured: Boolean(product.featured),
    gradient: product.gradient || 'from-[#0fa697] to-[#ff655b]',
    image: product.image || '',
    name: product.name,
    product_type: isGroup ? 'group' : 'single',
    slug: product.slug,
    tags:
      typeof product.tags === 'string'
        ? product.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
        : product.tags || [],
    required_fields: product.requiredFields || [],
    price_usd: singlePriceUsd,
    has_service_plus: Boolean(product.hasServicePlus || product.has_service_plus || false),
    warranty_months: Number(product.warrantyMonths || product.warranty_months || 18),
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
    const hasSp = Boolean(product.hasServicePlus || product.has_service_plus || false)
    const wm = Number(product.warrantyMonths || product.warranty_months || 18)

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
          has_service_plus: hasSp,
          warranty_months: wm,
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
          has_service_plus: hasSp,
          warranty_months: wm,
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

    for (let idx = 0; idx < rawItems.length; idx++) {
      const it = rawItems[idx]
      const itemPriceUsd = sanitizeUsd(
        it.priceUsd !== undefined ? it.priceUsd : it.price_usd || it.price || 0,
        product.exchangeRate || 4500,
      )

      const itemStock = Number(it.stock || 0)
      const itemStatus = it.status || (itemStock > 0 ? 'instock' : 'out-of-stock')
      const itemHasSp = Boolean(it.hasServicePlus || it.has_service_plus || false)
      const itemWm = Number(it.warrantyMonths || it.warranty_months || 18)

      if (it.id && typeof it.id === 'string' && it.id.length === 36) {
        await supabase
          .from('items')
          .update({
            name: it.name || 'Option',
            price_usd: itemPriceUsd,
            stock: itemStock,
            status: itemStatus,
            has_service_plus: itemHasSp,
            warranty_months: itemWm,
            sort_order: idx,
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
            has_service_plus: itemHasSp,
            warranty_months: itemWm,
            sort_order: idx,
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

// ============================================================================
// CUSTOMIZED ORDERING SERVICE FUNCTIONS
// ============================================================================

export async function getDailyCustomOrderCount(userId) {
  if (!userId) return 0
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await supabase
    .from('custom_orders')
    .select('id')
    .eq('user_id', userId)
    .gte('created_at', yesterday)

  if (error) {
    console.error('Error fetching daily custom order count:', error)
    return 0
  }
  return data?.length || 0
}

export async function createCustomOrder({
  user,
  productName,
  providerName,
  orderType = 'Key',
  accountInfo = {},
  targetRegion = 'Global',
  productUrl = '',
  notes = '',
  contactMethods = [],
}) {
  if (!user?.id) throw new Error('You must be signed in to submit a customized order request.')

  // Check 3/day quota
  const todayCount = await getDailyCustomOrderCount(user.id)
  if (todayCount >= 3) {
    throw new Error('Daily limit reached. You can create up to 3 customized orders per day.')
  }

  const payload = {
    user_id: user.id,
    user_email: user.email,
    product_name: productName.trim(),
    provider_name: providerName.trim(),
    order_type: orderType,
    account_info: accountInfo || {},
    target_region: targetRegion || 'Global',
    product_url: productUrl ? productUrl.trim() : null,
    notes: notes ? notes.trim() : null,
    contact_methods: Array.isArray(contactMethods) ? contactMethods : [],
    status: 'pending_quote',
  }

  const { data, error } = await supabase
    .from('custom_orders')
    .insert([payload])
    .select()
    .single()

  if (error) throw error

  // Notify admin of incoming custom order request
  await supabase.from('notifications').insert({
    audience: 'admin',
    message: `${user.email} requested a custom order: "${productName}" (${providerName}).`,
    read: false,
    title: 'New Custom Order Request',
    type: 'custom_order_requested',
    user_id: user.id,
  })

  return camelizeCustomOrder(data)
}

export async function quoteCustomOrder({ id, priceMmk, priceUsd = null, adminNotes = '' }) {
  const { data, error } = await supabase
    .from('custom_orders')
    .update({
      quoted_price_mmk: Number(priceMmk),
      quoted_price_usd: priceUsd ? Number(priceUsd) : null,
      admin_notes: adminNotes || null,
      status: 'quoted',
      quoted_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (data?.user_id) {
    await supabase.from('notifications').insert({
      audience: 'customer',
      message: `Your custom request for "${data.product_name}" was approved! Quoted price: ${Number(priceMmk).toLocaleString()} MMK. Click to pay.`,
      read: false,
      title: 'Custom Order Quoted',
      type: 'custom_order_quoted',
      user_id: data.user_id,
    })
  }

  return camelizeCustomOrder(data)
}

export async function rejectCustomOrder({ id, reason = '' }) {
  const { data, error } = await supabase
    .from('custom_orders')
    .update({
      status: 'rejected',
      rejection_reason: reason || 'Unable to fulfill this customized request at this time.',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error

  if (data?.user_id) {
    await supabase.from('notifications').insert({
      audience: 'customer',
      message: `Your custom order request for "${data.product_name}" could not be fulfilled: ${reason || 'Unavailable'}`,
      read: false,
      title: 'Custom Order Declined',
      type: 'custom_order_rejected',
      user_id: data.user_id,
    })
  }

  return camelizeCustomOrder(data)
}

export async function payCustomOrderWithWallet({ customOrderId, amountMmk }) {
  const { data, error } = await supabase.rpc('pay_custom_order_with_wallet', {
    custom_order_id_input: customOrderId,
    amount_mmk_input: Number(amountMmk),
  })

  if (error) throw error
  return data
}

export async function cancelCustomOrder(id) {
  const { data, error } = await supabase
    .from('custom_orders')
    .update({
      status: 'cancelled',
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return camelizeCustomOrder(data)
}

export async function deliverCustomOrder({ customOrderId, deliveryMessage }) {
  const { data, error } = await supabase
    .from('custom_orders')
    .update({
      status: 'delivered',
      delivery_message: deliveryMessage,
      delivered_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', customOrderId)
    .select()
    .single()

  if (error) throw error

  if (data?.user_id) {
    await supabase.from('notifications').insert({
      audience: 'customer',
      message: `Your customized order for "${data.product_name}" is delivered! Check your order details to view credentials/keys.`,
      read: false,
      title: 'Custom Order Delivered',
      type: 'custom_order_delivered',
      user_id: data.user_id,
    })
  }

  return camelizeCustomOrder(data)
}

export async function deleteCustomOrder(id) {
  const { error } = await supabase
    .from('custom_orders')
    .delete()
    .eq('id', id)

  if (error) throw error
}

/**
 * ----------------------------------------------------------------------------
 * VIP SUBSCRIPTION MANAGEMENT METHODS
 * ----------------------------------------------------------------------------
 */

export async function subscribeToPlanWithWallet({ planId, billingCycle = 'monthly', user }) {
  if (!user?.id) throw new Error('User authentication required.')

  const prices = {
    lunar: { monthly: 4999, yearly: 49999, days: { monthly: 30, yearly: 365 } },
    lunar_plus: { monthly: 9999, yearly: 99999, days: { monthly: 30, yearly: 365 } },
    stellar: { monthly: 49999, yearly: 499999, days: { monthly: 30, yearly: 365 } },
  }

  const planInfo = prices[planId]
  if (!planInfo) throw new Error('Invalid plan selected.')
  const priceMmk = planInfo[billingCycle]
  const durationDays = planInfo.days[billingCycle]

  // 1. Attempt RPC first
  try {
    const { data: rpcData, error: rpcError } = await supabase.rpc('purchase_subscription_with_wallet', {
      user_id_input: user.id,
      plan_id_input: planId,
      billing_cycle_input: billingCycle,
    })

    if (!rpcError && rpcData?.success) {
      return rpcData
    }
  } catch (rpcErr) {
    console.warn('RPC purchase_subscription_with_wallet failed, falling back:', rpcErr)
  }

  // 2. Direct fallback update
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('wallet_balance, subscription_tier, subscription_expires_at')
    .eq('id', user.id)
    .single()

  if (profileErr) throw profileErr
  if ((profile.wallet_balance || 0) < priceMmk) {
    throw new Error(
      `Insufficient wallet balance. You have ${(profile.wallet_balance || 0).toLocaleString()} MMK, but ${priceMmk.toLocaleString()} MMK is required.`,
    )
  }

  const now = new Date()
  let expiresAt = new Date()
  if (
    profile.subscription_tier === planId &&
    profile.subscription_expires_at &&
    new Date(profile.subscription_expires_at) > now
  ) {
    expiresAt = new Date(new Date(profile.subscription_expires_at).getTime() + durationDays * 24 * 60 * 60 * 1000)
  } else {
    expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000)
  }

  // Deduct wallet balance and set tier
  const { data: updatedProfile, error: updateErr } = await supabase
    .from('profiles')
    .update({
      wallet_balance: (profile.wallet_balance || 0) - priceMmk,
      subscription_tier: planId,
      subscription_billing: billingCycle,
      subscription_expires_at: expiresAt.toISOString(),
      subscription_auto_renew: true,
      subscription_started_at: new Date().toISOString(),
    })
    .eq('id', user.id)
    .select()
    .single()

  if (updateErr) throw updateErr

  // Record wallet transaction
  await supabase.from('wallet_transactions').insert({
    user_id: user.id,
    type: 'debit',
    amount_mmk: priceMmk,
    created_by: user.id,
  })

  // Record subscription log
  try {
    await supabase.from('subscriptions').insert({
      user_id: user.id,
      user_email: user.email,
      tier: planId,
      billing_cycle: billingCycle,
      price_mmk: priceMmk,
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      status: 'active',
      auto_renew: true,
    })
  } catch (e) {
    console.warn('Subscriptions table log error:', e)
  }

  return {
    success: true,
    tier: planId,
    billingCycle,
    priceMmk,
    expiresAt: expiresAt.toISOString(),
  }
}

export async function toggleSubscriptionAutoRenew({ user, enabled }) {
  if (!user?.id) throw new Error('User authentication required.')
  const { data, error } = await supabase
    .from('profiles')
    .update({ subscription_auto_renew: Boolean(enabled) })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function cancelSubscriptionPlan({ user }) {
  if (!user?.id) throw new Error('User authentication required.')
  const { data, error } = await supabase
    .from('profiles')
    .update({
      subscription_auto_renew: false,
    })
    .eq('id', user.id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function checkAndProcessAutoRenewal({ user, profile }) {
  if (!user?.id || !profile) return null
  const tier = profile.subscriptionTier || profile.subscription_tier || 'free'
  if (tier === 'free') return null

  const expiresAt = profile.subscriptionExpiresAt || profile.subscription_expires_at
  if (!expiresAt) return null

  const now = new Date()
  const isExpired = new Date(expiresAt) <= now
  if (!isExpired) return null

  // If expired, try auto-renewal RPC
  try {
    const { data: result } = await supabase.rpc('renew_subscription_with_wallet', {
      user_id_input: user.id,
    })
    return result
  } catch (err) {
    console.warn('Auto renewal check warning:', err)
    return null
  }
}



