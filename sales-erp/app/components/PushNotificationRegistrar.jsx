"use client";

import { useEffect } from "react";
import { getMessaging, getToken, isSupported } from "firebase/messaging";
import { getFirebaseApp, hasFirebaseMessagingConfig } from "../../lib/firebase-client";
import { buildApiUrl } from "../utils/api";

const REGISTERED_PUSH_TOKEN_KEY = "registeredPushToken";

export default function PushNotificationRegistrar() {
  useEffect(() => {
    const registerPushToken = async () => {
      if (typeof window === "undefined") return;
      if (!("Notification" in window) || !("serviceWorker" in navigator)) return;
      if (!hasFirebaseMessagingConfig()) return;

      const authToken = window.localStorage.getItem("token");
      if (!authToken) return;

      const supported = await isSupported();
      if (!supported) return;

      const app = getFirebaseApp();
      if (!app) return;

      const serviceWorkerRegistration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js"
      );

      let permission = Notification.permission;
      if (permission === "default") {
        permission = await Notification.requestPermission();
      }
      if (permission !== "granted") return;

      const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
      if (!vapidKey) return;

      const messaging = getMessaging(app);
      const deviceToken = await getToken(messaging, {
        vapidKey,
        serviceWorkerRegistration,
      });

      if (!deviceToken) return;

      const existingToken = window.localStorage.getItem(REGISTERED_PUSH_TOKEN_KEY);
      if (existingToken === deviceToken) return;

      const response = await fetch(buildApiUrl("/api/notifications/device-tokens/"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Token ${authToken}`,
        },
        body: JSON.stringify({
          token: deviceToken,
          platform: "WEB",
        }),
      });

      if (response.ok) {
        window.localStorage.setItem(REGISTERED_PUSH_TOKEN_KEY, deviceToken);
      }
    };

    registerPushToken().catch(() => {});
  }, []);

  return null;
}
