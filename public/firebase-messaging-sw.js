importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");
firebase.initializeApp({apiKey:"AIzaSyCKCfAza8WuqZNEj5y4nV2ZU9-2OysosDg",messagingSenderId:"357584563202",appId:"1:357584563202:web:1f6d9047f93b5af03d0b1b"});
const messaging=firebase.messaging();
messaging.onBackgroundMessage(function(payload){
  self.registration.showNotification("ConduzRJ - Novo Pedido!",{body:payload.notification.body,icon:"/icon.png"});
});