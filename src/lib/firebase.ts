import { getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const missingFirebaseConfig = Object.entries(firebaseConfig)
  .filter(([, value]) => !value)
  .map(([key]) => key);

if (missingFirebaseConfig.length > 0) {
  throw new Error(
    `Missing Firebase environment variables: ${missingFirebaseConfig.join(', ')}`
  );
}

// Initialize Firebase
const app = getApps()[0] ?? initializeApp(firebaseConfig);

// App Check (bot/abuse defense) — browser-only. Attests that traffic comes
// from the genuine Donow web app, gating every Firestore write, Auth call and
// Storage request once enforcement is enabled in the Firebase console.
// Skipped silently if the site key isn't configured yet, so deploys never
// break before the console is set up.
if (typeof window !== 'undefined') {
  const siteKey = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_SITE_KEY;
  // In development, allow a debug token so localhost can obtain App Check
  // tokens without a real reCAPTCHA assessment. Set it in .env.local and
  // register the printed token in the Firebase console.
  const debugToken = process.env.NEXT_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN;
  if (debugToken) {
    (self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: string | boolean })
      .FIREBASE_APPCHECK_DEBUG_TOKEN = debugToken;
  }
  if (siteKey) {
    try {
      initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(siteKey),
        isTokenAutoRefreshEnabled: true,
      });
    } catch (err) {
      console.error('[firebase] App Check init failed:', err);
    }
  }
}

// Export Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
