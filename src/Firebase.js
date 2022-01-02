import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore/lite";

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

async function getCrosswords(db) {
  const crosswordCol = collection(db, "crossword");
  const crosswordSnapshot = await getDocs(crosswordCol);
  const crosswordList = crosswordSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
  console.log("crosswordList", crosswordList);
  return crosswordList;
}

export { app, db, getCrosswords };
