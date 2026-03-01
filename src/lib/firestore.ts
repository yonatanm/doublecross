import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  orderBy,
  Timestamp,
  updateDoc,
} from "firebase/firestore"
import { db, auth } from "./firebase"
import type { Crossword } from "@/types/crossword"

const COLLECTION = "crossword"

export async function saveCrossword(crossword: Omit<Crossword, "id">): Promise<string> {
  const user = auth.currentUser
  const data = {
    ...crossword,
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
    userId: user?.uid,
    userEmail: user?.email,
  }
  const docRef = await addDoc(collection(db, COLLECTION), data)
  return docRef.id
}

export async function updateCrossword(id: string, data: Partial<Crossword>): Promise<void> {
  const docRef = doc(db, COLLECTION, id)
  await updateDoc(docRef, {
    ...data,
    updatedAt: Timestamp.now(),
  })
}

export async function overwriteCrossword(id: string, crossword: Omit<Crossword, "id">): Promise<void> {
  const docRef = doc(db, COLLECTION, id)
  await setDoc(docRef, {
    ...crossword,
    updatedAt: Timestamp.now(),
  })
}

export async function getCrossword(id: string): Promise<Crossword | null> {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return { id: docSnap.id, ...docSnap.data() } as Crossword
}

export async function getUserCrosswords(userId: string): Promise<Crossword[]> {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId),
    orderBy("updatedAt", "desc")
  )
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as Crossword)
}

export async function archiveCrossword(id: string): Promise<void> {
  await updateCrossword(id, { status: "archived" })
}
