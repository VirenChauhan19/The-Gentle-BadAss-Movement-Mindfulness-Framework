import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'

self.skipWaiting()
void self.clients.claim()

precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

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
