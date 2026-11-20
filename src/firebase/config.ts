import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getFirestore, type Firestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY?.trim() ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN?.trim() ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID?.trim() ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET?.trim() ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID?.trim() ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID?.trim() ?? '',
};

const PLACEHOLDER_VALUES = new Set([
  '',
  'sua_api_key_aqui',
  'seu-projeto-id',
  'seu-projeto.firebaseapp.com',
]);

export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey &&
    firebaseConfig.projectId &&
    firebaseConfig.appId &&
    !PLACEHOLDER_VALUES.has(firebaseConfig.apiKey) &&
    !PLACEHOLDER_VALUES.has(firebaseConfig.projectId)
);

let app: FirebaseApp | null = null;
let db: Firestore | null = null;

if (isFirebaseConfigured) {
  app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
  db = getFirestore(app);
}

export { app, db };
