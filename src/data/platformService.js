import {
  requireSupabase, isStrictSupabaseMode, hasSupabaseConfig, signInWithPassword, refreshSession, getUserFromToken,
  getSharedProfile, upsertSharedProfile, getVcardCard, getVcardCardByUsername, upsertVcardCard,
  getVcardCart, upsertVcardCart, getUserRole, insertVcardTap, listVcardTaps, connectCardViaEdge,
} from '../config/supabase'
import { reportError } from '../config/monitoring'
import { loadData, saveData } from './platform'

const defaultProfile = { username: 'demo', name: 'Demo User', title: 'Founder · Sales Strategist', bio: 'Helping teams turn conversations into customers.', links: [{ label: 'Book Meeting', url: 'https://cal.com' }], theme: { card: '#0f172a', text: '#e2e8f0' } }

const SESSION_KEY = 'vcard_session'
export function getSession() { const raw = localStorage.getItem(SESSION_KEY); return raw ? JSON.parse(raw) : null }
export function getCurrentUserId() { return getSession()?.user?.id || '' }
export function getCurrentUsername() { return getSession()?.user?.email?.split('@')[0] || '' }
export async function signIn(email, password) { const s = await signInWithPassword(email, password); localStorage.setItem(SESSION_KEY, JSON.stringify(s)); return s }
export function signOut() { localStorage.removeItem(SESSION_KEY) }

export async function validateSession() {
  const s = getSession(); if (!s?.access_token) return null
  let user = await getUserFromToken(s.access_token)
  if (!user && s.refresh_token) {
    try {
      const refreshed = await refreshSession(s.refresh_token)
      localStorage.setItem(SESSION_KEY, JSON.stringify(refreshed))
      user = await getUserFromToken(refreshed.access_token)
    } catch (err) {
      reportError('session_refresh_failed', { message: err.message })
      signOut()
      return null
    }
  }
  return user
}

function canManageRole(role) { return role === 'admin' || role === 'manager' }
function fallbackOrThrow(fallbackFn) { if (isStrictSupabaseMode()) throw new Error('Supabase operation failed in strict mode'); return fallbackFn() }

export async function getProfile(username) {
  requireSupabase()
  if (!hasSupabaseConfig()) return fallbackOrThrow(() => loadData().profiles[username] || defaultProfile)
  try { return (await getSharedProfile(username)) || defaultProfile }
  catch (err) { reportError('profile_read_failed', { username, message: err.message }); return fallbackOrThrow(() => loadData().profiles[username] || defaultProfile) }
}

export async function saveProfile(profile, userId = getCurrentUserId()) {
  const role = await getRole(userId)
  if (profile.username !== getCurrentUsername() && !canManageRole(role)) throw new Error('Cannot edit another user profile')
  const local = loadData(); saveData({ ...local, profiles: { ...local.profiles, [profile.username]: profile } })
  if (hasSupabaseConfig()) await upsertSharedProfile(profile)
}

export async function getCardUsername(cardId) { if (!hasSupabaseConfig()) return fallbackOrThrow(() => loadData().cards[cardId] || null); try { const row = await getVcardCard(cardId); return row?.username || null } catch (err) { reportError('card_lookup_failed', { cardId, message: err.message }); return fallbackOrThrow(() => loadData().cards[cardId] || null) } }

export async function connectCard(cardId, username, userId = getCurrentUserId()) {
  const role = await getRole(userId)
  if (!canManageRole(role) && username !== getCurrentUsername()) throw new Error('Insufficient role to connect cards')
  await connectCardViaEdge({ cardId, username, userId, accessToken: getSession()?.access_token })
  const local = loadData(); saveData({ ...local, cards: { ...local.cards, [cardId]: username } })
  if (hasSupabaseConfig()) await upsertVcardCard(cardId, username)
}

export async function getCart(username = getCurrentUsername()) { if (!hasSupabaseConfig()) return fallbackOrThrow(() => loadData().cart || []); try { return await getVcardCart(username) } catch (err) { reportError('cart_read_failed', { username, message: err.message }); return fallbackOrThrow(() => loadData().cart || []) } }
export async function saveCart(username = getCurrentUsername(), items = []) { if (username !== getCurrentUsername()) throw new Error('Cannot edit another user cart'); const local = loadData(); saveData({ ...local, cart: items }); if (hasSupabaseConfig()) await upsertVcardCart(username, items) }
export async function getRole(userId = getCurrentUserId()) { if (!hasSupabaseConfig()) return fallbackOrThrow(() => 'admin'); try { return await getUserRole(userId) } catch (err) { reportError('role_read_failed', { userId, message: err.message }); return fallbackOrThrow(() => 'user') } }
export async function logTap(cardId, username) { if (!hasSupabaseConfig()) return fallbackOrThrow(() => null); await insertVcardTap({ card_id: cardId, username, tapped_at: new Date().toISOString() }) }
export async function getTapEvents(limit = 50) { if (!hasSupabaseConfig()) return fallbackOrThrow(() => []); return listVcardTaps(limit) }

export async function getOnboardingStatus(userId = getCurrentUserId()) {
  const username = getCurrentUsername() || 'demo'
  const profile = await getProfile(username)
  const role = await getRole(userId || 'demo')
  let cardId = null
  if (hasSupabaseConfig()) { const row = await getVcardCardByUsername(username).catch(() => null); cardId = row?.card_id || null }
  else { cardId = fallbackOrThrow(() => { const local = loadData(); const cardEntry = Object.entries(local.cards || {}).find(([, u]) => u === username); return cardEntry?.[0] || null }) }
  return { hasProfile: Boolean(profile?.username && profile?.name), hasConnectedCard: Boolean(cardId), role, cardId }
}

export { defaultProfile }
