import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocs,
  query,
  where,
  Timestamp,
  updateDoc,
} from "firebase/firestore"
import { db, auth } from "./firebase"
import type { Crossword } from "@/types/crossword"

const COLLECTION = "crossword"

// Firestore doesn't support nested arrays (grid is CrosswordCell[][]).
// Serialize complex fields to JSON strings before saving, parse on read.

function serializeForFirestore(crossword: Omit<Crossword, "id">) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = { ...crossword }
  if (data.grid) data.grid = JSON.stringify(data.grid)
  if (data.layout_result) data.layout_result = JSON.stringify(data.layout_result)
  if (data.clues_across) data.clues_across = JSON.stringify(data.clues_across)
  if (data.clues_down) data.clues_down = JSON.stringify(data.clues_down)
  if (data.raw_clues) data.raw_clues = JSON.stringify(data.raw_clues)
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function deserializeFromFirestore(data: any): Crossword {
  if (typeof data.grid === "string") data.grid = JSON.parse(data.grid)
  if (typeof data.layout_result === "string") data.layout_result = JSON.parse(data.layout_result)
  if (typeof data.clues_across === "string") data.clues_across = JSON.parse(data.clues_across)
  if (typeof data.clues_down === "string") data.clues_down = JSON.parse(data.clues_down)
  if (typeof data.raw_clues === "string") data.raw_clues = JSON.parse(data.raw_clues)
  return data as Crossword
}

export async function saveCrossword(crossword: Omit<Crossword, "id">): Promise<string> {
  const user = auth.currentUser
  const data = {
    ...serializeForFirestore(crossword),
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
    ...serializeForFirestore(data as Omit<Crossword, "id">),
    updatedAt: Timestamp.now(),
  })
}

export async function overwriteCrossword(id: string, crossword: Omit<Crossword, "id">): Promise<void> {
  const user = auth.currentUser
  const docRef = doc(db, COLLECTION, id)
  await setDoc(docRef, {
    ...serializeForFirestore(crossword),
    updatedAt: Timestamp.now(),
    userId: user?.uid,
    userEmail: user?.email,
  })
}

export async function getCrossword(id: string): Promise<Crossword | null> {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return deserializeFromFirestore({ id: docSnap.id, ...docSnap.data() })
}

export async function getUserCrosswords(userId: string): Promise<Crossword[]> {
  const q = query(
    collection(db, COLLECTION),
    where("userId", "==", userId)
  )
  const snapshot = await getDocs(q)
  const results = snapshot.docs.map((d) => deserializeFromFirestore({ id: d.id, ...d.data() }))
  // Sort client-side to avoid requiring a Firestore composite index
  results.sort((a, b) => {
    const aTime = a.updatedAt?.seconds ?? 0
    const bTime = b.updatedAt?.seconds ?? 0
    return bTime - aTime
  })
  return results
}

export async function archiveCrossword(id: string): Promise<void> {
  await updateCrossword(id, { status: "archived" })
}

/** One-time repair: patch documents missing userId with current user */
export async function repairMissingUserIds(): Promise<number> {
  const user = auth.currentUser
  if (!user) return 0
  const snapshot = await getDocs(collection(db, COLLECTION))
  let fixed = 0
  for (const d of snapshot.docs) {
    const data = d.data()
    if (!data.userId) {
      await updateDoc(doc(db, COLLECTION, d.id), {
        userId: user.uid,
        userEmail: user.email,
      })
      fixed++
    }
  }
  return fixed
}
