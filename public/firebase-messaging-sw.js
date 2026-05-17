importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.13.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyBm2Kb0ViOzHMEdu1aHpqmfh1XAK8kPwBU',
  authDomain: 'app-89062.firebaseapp.com',
  databaseURL: 'https://app-89062-default-rtdb.firebaseio.com',
  projectId: 'app-89062',
  storageBucket: 'app-89062.firebasestorage.app',
  messagingSenderId: '681098406464',
  appId: '1:681098406464:web:df8b592681d6a9a1ebcda5',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage(payload => {
  const data = payload.data || {}
  const title = data.title || '4 App'
  const body = data.body || ''
  const tag = data.conversationId || 'default'

  self.registration.showNotification(title, {
    body,
    icon: '/favicon.svg',
    badge: '/favicon.svg',
    tag,
    data: { conversationId: data.conversationId, callerId: data.callerId, type: data.type },
    vibrate: [200, 100, 200],
    requireInteraction: data.type === 'call',
  })
})

self.addEventListener('notificationclick', event => {
  event.notification.close()
  const data = event.notification.data || {}
  const url = data.conversationId
    ? `/#/?chat=${data.conversationId}`
    : '/'
  event.waitUntil(clients.openWindow(url))
})
