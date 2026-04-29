const ALERT_WEBHOOK = import.meta.env.VITE_ALERT_WEBHOOK_URL

export async function reportError(event, details = {}) {
  // Always log locally
  console.error(`[monitoring] ${event}`, details)
  if (!ALERT_WEBHOOK) return
  try {
    await fetch(ALERT_WEBHOOK, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, details, ts: new Date().toISOString() }),
    })
  } catch {
    // no-op for alert transport failures
  }
}
