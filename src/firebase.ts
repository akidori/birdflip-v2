import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import type { WorkspaceData } from './types';

const firebaseConfig = {
  apiKey: "AIzaSyAjBviZ8Pcg3fX8ti2y3y1nMcBz_Dps7mw",
  authDomain: "birdstraike.firebaseapp.com",
  projectId: "birdstraike",
  storageBucket: "birdstraike.firebasestorage.app",
  messagingSenderId: "177151250196",
  appId: "1:177151250196:web:21aefe5c0a53dcb82b7c01"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export async function googleLogin() {
  return signInWithPopup(auth, provider);
}

export async function googleLogout() {
  return signOut(auth);
}

export function onAuth(cb: (user: User | null) => void) {
  return onAuthStateChanged(auth, cb);
}

// Get user's workspace ID
export async function getUserWorkspaceId(uid: string): Promise<string | null> {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (userDoc.exists()) {
    return userDoc.data().workspaceId || null;
  }
  return null;
}

// Create workspace for new user
export async function createWorkspace(uid: string, email: string): Promise<string> {
  const wsId = 'ws_' + uid.slice(0, 8);
  await setDoc(doc(db, 'workspaces', wsId), {
    createdBy: uid,
    createdAt: new Date().toISOString(),
    clients: [], tasks: [], invoices: [],
    company: { name: '', zip: '', addr: '', tel: '', email: '', bank: '', branch: '', aType: '普通', aNo: '', aName: '', reg: '' },
    lastUpdated: new Date().toISOString(),
  }, { merge: true });
  await setDoc(doc(db, 'users', uid), { workspaceId: wsId, email }, { merge: true });
  return wsId;
}

// Load workspace data
export async function loadWorkspace(wsId: string): Promise<WorkspaceData | null> {
  const wsDoc = await getDoc(doc(db, 'workspaces', wsId));
  if (wsDoc.exists()) {
    return wsDoc.data() as WorkspaceData;
  }
  return null;
}

// Save workspace data
export async function saveWorkspace(wsId: string, data: WorkspaceData) {
  data.lastUpdated = new Date().toISOString();
  await setDoc(doc(db, 'workspaces', wsId), data, { merge: true });
}

// Realtime listener
export function onWorkspaceChange(wsId: string, cb: (data: WorkspaceData) => void) {
  return onSnapshot(doc(db, 'workspaces', wsId), (snap) => {
    if (snap.exists()) cb(snap.data() as WorkspaceData);
  });
}
export type { User } from "firebase/auth";
