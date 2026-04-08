import {
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  deleteDoc,
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
  // Strip undefined values — Firebase v12 modular SDK rejects them
  for (const key of Object.keys(data)) {
    if (data[key] === undefined) delete data[key]
  }
  if (data.grid) data.grid = JSON.stringify(data.grid)
  if (data.layout_result) data.layout_result = JSON.stringify(data.layout_result)
  if (data.clues_across) data.clues_across = JSON.stringify(data.clues_across)
  if (data.clues_down) data.clues_down = JSON.stringify(data.clues_down)
  if (data.raw_clues) data.raw_clues = JSON.stringify(data.raw_clues)
  return data
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fixSplitClueJoin(clue: string): string {
  return clue.replace(/ ?ו(\d)/g, "\u00A0ו-$1")
}

function deserializeFromFirestore(data: any): Crossword {
  if (typeof data.grid === "string") data.grid = JSON.parse(data.grid)
  if (typeof data.layout_result === "string") data.layout_result = JSON.parse(data.layout_result)
  if (typeof data.clues_across === "string") data.clues_across = JSON.parse(data.clues_across)
  if (typeof data.clues_down === "string") data.clues_down = JSON.parse(data.clues_down)
  if (typeof data.raw_clues === "string") data.raw_clues = JSON.parse(data.raw_clues)
  for (const clues of [data.clues_across, data.clues_down]) {
    if (Array.isArray(clues)) clues.forEach((c: any) => { if (c.clue) c.clue = fixSplitClueJoin(c.clue) })
  }
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
    userDisplayName: user?.displayName || undefined,
    userPhotoURL: user?.photoURL || undefined,
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
  const serialized = serializeForFirestore(crossword)
  // Strip caller-supplied ownership fields — always use current auth user
  delete serialized.userId
  delete serialized.userEmail
  delete serialized.userDisplayName
  delete serialized.userPhotoURL
  await setDoc(docRef, {
    ...serialized,
    updatedAt: Timestamp.now(),
    userId: user?.uid,
    userEmail: user?.email,
    userDisplayName: user?.displayName || undefined,
    userPhotoURL: user?.photoURL || undefined,
  })
}

export async function getCrossword(id: string): Promise<Crossword | null> {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDoc(docRef)
  if (!docSnap.exists()) return null
  return deserializeFromFirestore({ id: docSnap.id, ...docSnap.data() })
}

/** Always fetch from server, bypassing Firestore local cache. */
export async function getCrosswordFresh(id: string): Promise<Crossword | null> {
  const docRef = doc(db, COLLECTION, id)
  const docSnap = await getDocFromServer(docRef)
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

export async function getAllCrosswords(): Promise<Crossword[]> {
  const snapshot = await getDocs(collection(db, COLLECTION))
  const results = snapshot.docs.map((d) => deserializeFromFirestore({ id: d.id, ...d.data() }))
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

/** Fetch archived crosswords for review before deletion. Admin sees all, regular user sees own. */
export async function getArchivedCrosswords(isAdmin = false): Promise<Crossword[]> {
  const user = auth.currentUser
  if (!user) return []
  const constraints = [where("status", "==", "archived")]
  if (!isAdmin) constraints.push(where("userId", "==", user.uid))
  const q = query(collection(db, COLLECTION), ...constraints)
  const snapshot = await getDocs(q)
  return snapshot.docs.map((d) => deserializeFromFirestore({ id: d.id, ...d.data() }))
}

/** Delete specific crosswords by ID. */
export async function deleteCrosswordsByIds(ids: string[]): Promise<number> {
  let deleted = 0
  for (const id of ids) {
    await deleteDoc(doc(db, COLLECTION, id))
    deleted++
  }
  return deleted
}
