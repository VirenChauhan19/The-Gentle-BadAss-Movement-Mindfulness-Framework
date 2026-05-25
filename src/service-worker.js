import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

self.skipWaiting()
void self.clients.claim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

// Total cache purge on activate: delete every cache except the current
// precache. Combined with skipWaiting + clientsClaim above (and the autoUpdate
// page reload on the client), every user who opens or refocuses the site wipes
// any stale cached assets and reloads straight into the latest version.
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => !key.startsWith('workbox-precache'))
          .map(key => caches.delete(key))
      )
    )
  )
})

const BREATH_NOTIFICATION = {
  title: 'Time to Breathe',
  body: 'Take 60 seconds. Let your breath become Slow, Long, and Deep. Drop the tension.',
  icon: '/la-ultra-icon.svg',
  badge: '/la-ultra-icon.svg',
}

self.addEventListener('message', event => {
  if (event.data?.type !== 'BREATH_REMINDER_SETTINGS') return
  self.breathReminderSettings = event.data.settings
})

self.addEventListener('push', event => {
  let payload = {}
  try {
    payload = event.data?.json() || {}
  } catch {
    payload = { body: event.data?.text() }
  }

  const notification = {
    ...BREATH_NOTIFICATION,
    ...payload.notification,
    data: {
      url: payload.url || '/#/breathing',
      reminderType: 'breathing',
      ...(payload.data || {}),
    },
    tag: payload.tag || 'breathing-reminder',
    renotify: true,
  }

  event.waitUntil(
    self.registration.showNotification(
      payload.title || notification.title,
      notification
    )
  )
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/#/breathing'
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(clients => {
        const existing = clients.find(client => client.url.includes('/#/breathing'))
        if (existing) return existing.focus()
        return self.clients.openWindow(url)
      })
  )
})
