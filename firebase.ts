import { initializeApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import firebaseConfig from './firebase-applet-config.json';

const firebaseApiKeyEncoded = process.env.NEXT_PUBLIC_FIREBASE_API_KEY_B64;

if (!firebaseApiKeyEncoded) {
  throw new Error('Missing NEXT_PUBLIC_FIREBASE_API_KEY_B64 environment variable.');
}

const firebaseApiKey =
  typeof window === 'undefined'
    ? Buffer.from(firebaseApiKeyEncoded, 'base64').toString('utf-8').trim()
    : atob(firebaseApiKeyEncoded).trim();

// Initialize Firebase SDK
const app = initializeApp({
  ...firebaseConfig,
  apiKey: firebaseApiKey,
});
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const storage = getStorage(app);

let authInstance: Auth | null = null;
export function getClientAuth(): Auth {
  if (typeof window === 'undefined') {
    throw new Error('Firebase Auth is only available in the browser.');
  }
  if (!authInstance) {
    authInstance = getAuth(app);
  }
  return authInstance;
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const currentUser =
    typeof window !== 'undefined'
      ? getClientAuth().currentUser
      : undefined;
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: currentUser?.uid,
      email: currentUser?.email,
      emailVerified: currentUser?.emailVerified,
      isAnonymous: currentUser?.isAnonymous,
      tenantId: currentUser?.tenantId,
      providerInfo: currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}
