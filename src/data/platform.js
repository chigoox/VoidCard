export const STORAGE_KEY = 'voidcard_platform_v1'

export const defaultProfiles = {
  demo: {
    username: 'demo',
    name: 'Demo User',
    title: 'Founder · Sales Strategist',
    bio: 'Helping teams turn conversations into customers.',
    avatar: '',
    theme: {
      accent: '#22d3ee',
      bg: '#020617',
      card: '#0f172a',
      text: '#e2e8f0',
    },
    links: [
      { label: 'Book Meeting', url: 'https://cal.com' },
      { label: 'Website', url: 'https://example.com' },
    ],
  },
}

export function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY)
  if (!raw) return { profiles: defaultProfiles, cards: {}, cart: [] }
  try {
    const parsed = JSON.parse(raw)
    return {
      profiles: parsed.profiles || defaultProfiles,
      cards: parsed.cards || {},
      cart: parsed.cart || [],
    }
  } catch {
    return { profiles: defaultProfiles, cards: {}, cart: [] }
  }
}

export function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
