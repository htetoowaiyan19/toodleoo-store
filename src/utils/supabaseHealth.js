import { supabase, isSupabaseConfigured } from '../supabase'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

/**
 * Fast network ping to Supabase REST endpoint with a strict timeout.
 * Returns { ok: boolean, error?: string }
 */
export async function checkSupabaseHealth(timeoutMs = 3500) {
  if (!isSupabaseConfigured || !supabaseUrl) {
    return { ok: false, error: 'Supabase URL not configured' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => {
    try {
      controller.abort()
    } catch {}
  }, timeoutMs)

  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/store_settings?select=key&limit=1`, {
      method: 'GET',
      headers: {
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${supabaseAnonKey}`,
      },
      signal: controller.signal,
    })

    clearTimeout(timer)

    // Any HTTP response (200, 206, 401, 403, 404, etc.) proves the network server was reached
    if (res.status > 0) {
      return { ok: true }
    }

    return { ok: false, error: `HTTP ${res.status}` }
  } catch (err) {
    clearTimeout(timer)
    const isTimeout = err?.name === 'AbortError'
    return {
      ok: false,
      error: isTimeout ? 'Connection timed out (Regional ISP block)' : (err?.message || 'Network error'),
    }
  }
}
