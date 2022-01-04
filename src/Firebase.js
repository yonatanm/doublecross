//https://firebase.google.com/docs/firestore/manage-data/add-data
import { initializeApp } from "firebase/app";
import {
  getFirestore,
  collection,
  getDocs,
  getDoc,
  setDoc,
  doc,
  addDoc,
  Timestamp,
  query,
  orderBy,
  where
} from "firebase/firestore/lite";
// import { doc, Timestamp } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAeccL_SuxKvZipxrTCQGoGsu9yo58SoHY",
  authDomain: "doublecross-e30cb.firebaseapp.com",
  projectId: "doublecross-e30cb",
  storageBucket: "doublecross-e30cb.appspot.com",
  messagingSenderId: "48915359066",
  appId: "1:48915359066:web:28a74c2243ae7e3293ff63",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function updateCrossword(theId, crosswordModel) {
  crosswordModel.updatedAt = Timestamp.now();
  const r = await setDoc(doc(db, "crossword", theId), crosswordModel);
  console.log("update", r);
  return r;
}

async function saveNewCrossword(crosswordModel) {
  crosswordModel.createdAt = Timestamp.now();
  crosswordModel.updatedAt = Timestamp.now();
  const r = await addDoc(collection(db, "crossword"), crosswordModel);
  console.log("save", r.id);
  return r.id;
}

async function getCrossword(id) {
  const docRef = doc(db, "crossword", id);
  console.log("docRef", docRef);
  const docSnap = await getDoc(docRef);
  if (docSnap.exists()) {
    const res = { id: docSnap.id, ...docSnap.data() };
    console.log("res", res);
    return res;
  } else {
    // doc.data() will be undefined in this case
    console.log("No such document!");
    return;
  }
}
async function getAllCrosswords() {
  const crosswordCol = collection(db, "crossword");
  const q = query(crosswordCol, 
    orderBy('createdAt', 'desc'));
  const crosswordSnapshot = await getDocs(q);

  const crosswordList = crosswordSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  console.log("crosswordList", crosswordList);
  return crosswordList;
}

export { app, getAllCrosswords, getCrossword, saveNewCrossword, updateCrossword };
