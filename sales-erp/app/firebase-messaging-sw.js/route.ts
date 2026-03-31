const serviceWorkerSource = `
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.11.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "${process.env.NEXT_PUBLIC_FIREBASE_API_KEY || ""}",
  authDomain: "${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || ""}",
  projectId: "${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || ""}",
  storageBucket: "${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || ""}",
  messagingSenderId: "${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || ""}",
  appId: "${process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""}"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "Inventory Alert";
  const notificationOptions = {
    body: payload.notification?.body || "",
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
`;

export async function GET() {
  return new Response(serviceWorkerSource, {
    headers: {
      "Content-Type": "application/javascript; charset=utf-8",
      "Cache-Control": "no-store, max-age=0",
    },
  });
}

