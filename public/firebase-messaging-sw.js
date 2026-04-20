importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCKCfAzaBWuqZNEj5y4nV2ZU9-2OysosDg",
  authDomain: "conduzrj.firebaseapp.com",
  projectId: "conduzrj",
  storageBucket: "conduzrj.firebasestorage.app",
  messagingSenderId: "357584563202",
  appId: "1:357584563202:web:1f6d9047f93b5af03d0b1b",
  databaseURL: "https://conduzrj-default-rtdb.firebaseio.com"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('Notificação em segundo plano:', payload);
  const { title, body } = payload.notification;
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200],
    tag: 'conduzrj-pedido',
    requireInteraction: true,
  });
});
