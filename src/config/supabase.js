const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY
const REQUIRE_SUPABASE = import.meta.env.VITE_REQUIRE_SUPABASE === 'true'
const EDGE_CONNECT_CARD_URL = import.meta.env.VITE_EDGE_CONNECT_CARD_URL

function headers(token) {
  return {
    'Content-Type': 'application/json',
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
  }
}

async function request(path, options = {}) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { ...headers(options.token), ...(options.headers || {}) },
    ...options,
  })
  if (!res.ok) throw new Error(`Supabase request failed: ${path}`)
  if (res.status === 204) return null
  return res.json()
}

export function hasSupabaseConfig() { return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY) }
export function isStrictSupabaseMode() { return REQUIRE_SUPABASE }
export function requireSupabase() { if (REQUIRE_SUPABASE && !hasSupabaseConfig()) throw new Error('Supabase is required in this environment') }

export async function signInWithPassword(email, password) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, { method: 'POST', headers: headers(), body: JSON.stringify({ email, password }) })
  if (!res.ok) throw new Error('Invalid credentials')
  return res.json()
}

export async function refreshSession(refreshToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify({ refresh_token: refreshToken }),
  })
  if (!res.ok) throw new Error('Session refresh failed')
  return res.json()
}

export async function getUserFromToken(accessToken) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: headers(accessToken) })
  if (!res.ok) return null
  return res.json()
}

export async function getSharedProfile(username) { const rows = await request(`profile?username=eq.${encodeURIComponent(username)}&select=*`); return rows?.[0] || null }
export async function upsertSharedProfile(profile) { await request('profile', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify(profile) }) }
export async function getVcardCard(cardId) { const rows = await request(`vcard_cards?card_id=eq.${encodeURIComponent(cardId)}&select=*`); return rows?.[0] || null }
export async function getVcardCardByUsername(username) { const rows = await request(`vcard_cards?username=eq.${encodeURIComponent(username)}&select=card_id,username&limit=1`); return rows?.[0] || null }
export async function upsertVcardCard(card_id, username) { await request('vcard_cards', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ card_id, username }) }) }
export async function getVcardCart(username) { const rows = await request(`vcard_carts?username=eq.${encodeURIComponent(username)}&select=items`); return rows?.[0]?.items || [] }
export async function upsertVcardCart(username, items) { await request('vcard_carts', { method: 'POST', headers: { Prefer: 'resolution=merge-duplicates' }, body: JSON.stringify({ username, items }) }) }
export async function getUserRole(user_id) { const rows = await request(`admin_users?user_id=eq.${encodeURIComponent(user_id)}&select=role`); return rows?.[0]?.role || 'user' }
export async function insertVcardTap(event) { await request('vcard_taps', { method: 'POST', body: JSON.stringify(event) }) }
export async function listVcardTaps(limit = 50) { return request(`vcard_taps?select=card_id,username,tapped_at&order=tapped_at.desc&limit=${limit}`) }

export async function connectCardViaEdge(payload) {
  if (!EDGE_CONNECT_CARD_URL) return false
  const res = await fetch(EDGE_CONNECT_CARD_URL, { method: 'POST', headers: headers(payload.accessToken), body: JSON.stringify(payload) })
  if (!res.ok) throw new Error('Edge connect-card validation failed')
  return true
}
