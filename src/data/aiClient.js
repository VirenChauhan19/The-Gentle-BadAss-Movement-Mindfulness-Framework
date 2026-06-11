// Calls the AI coach through our own Cloud Function proxy instead of hitting
// OpenRouter directly. The proxy holds the OpenRouter key server-side (a real
// secret) and verifies the caller's Firebase sign-in, so the key is NEVER
// shipped to the browser. All AI features are sign-in only, so a token always
// exists here.

import { auth } from '../firebase'

// Same-project 2nd-gen function alias. Override with VITE_AI_PROXY_URL if needed.
const AI_PROXY_URL =
  import.meta.env.VITE_AI_PROXY_URL ||
  'https://us-central1-gentle-badass.cloudfunctions.net/aiProxy'

/**
 * Forward a chat-completion request through the proxy.
 * @param {object} body { model?, messages, max_tokens?, temperature? }
 * @returns the OpenRouter JSON response (same shape as before).
 */
export async function callOpenRouter(body) {
  const u = auth?.currentUser
  if (!u) throw new Error('Please sign in to use the AI coach.')

  const token = await u.getIdToken()
  const res = await fetch(AI_PROXY_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    if (res.status === 429) throw new Error('Rate limit reached, wait 30 seconds and try again.')
    if (res.status === 401) throw new Error('Please sign in again to use the AI coach.')
    const message = e.error?.message || e.error || `AI error ${res.status}`
    throw new Error(message)
  }
  return res.json()
}
