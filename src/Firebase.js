//https://firebase.google.com/docs/firestore/manage-data/add-data
// import { initializeApp } from "firebase/app";
// import {
//   getFirestore,
//   collection,
//   getDocs,
//   getDoc,
//   setDoc,
//   doc,
//   addDoc,
//   Timestamp,
//   query,
//   orderBy,
//   where
// } from "firebase/firestore/lite";
// import { doc, Timestamp } from "firebase/firestore";

import firebase from "firebase/compat/app";
import "firebase/compat/firestore";
import {
  getDoc,
  doc,
  where,
  getFirestore,
  collection,
  query,
  addDoc,
  setDoc,
  getDocs,
  Timestamp,
} from "firebase/firestore";

import {
  getStorage,
  ref,
  uploadBytes,
  uploadString,
  getDownloadURL,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyAeccL_SuxKvZipxrTCQGoGsu9yo58SoHY",
  authDomain: "doublecross-e30cb.firebaseapp.com",
  projectId: "doublecross-e30cb",
  storageBucket: "doublecross-e30cb.appspot.com",
  messagingSenderId: "48915359066",
  appId: "1:48915359066:web:28a74c2243ae7e3293ff63",
};

const app = firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const storage = getStorage(app);

async function updateCrossword(theId, crosswordModel) {
  crosswordModel.updatedAt = Timestamp.now();
  crosswordModel.user = {
    uid: firebase.auth().currentUser.multiFactor.user.uid,
    email: firebase.auth().currentUser.multiFactor.user.email,
  };
  const r = await setDoc(doc(db, "crossword", theId), crosswordModel);
  console.log("update", r);
  return r;
}

async function saveNewCrossword(crosswordModel) {
  crosswordModel.createdAt = Timestamp.now();
  crosswordModel.updatedAt = Timestamp.now();
  crosswordModel.user = {
    uid: firebase.auth().currentUser.multiFactor.user.uid,
    email: firebase.auth().currentUser.multiFactor.user.email,
  };
  const r = await addDoc(collection(db, "crossword"), crosswordModel);
  console.log("save", r.id);
  return r.id;
}

async function getCrossword(id) {
  console.log(
    "in getCrossword ",
    id,
    "for user",
    firebase.auth().currentUser.multiFactor.user.uid
  );


  // const crosswordCol = db
  //   .collection("crossword")
  //   .where("id", "==", id)
  //   // .where("user.uid", "==", firebase.auth().currentUser.multiFactor.user.uid);

  try {
    // const crosswordSnapshot = await crosswordCol.get();
    const docRef = doc(db, "crossword", id);
    const docSnap = await getDoc(docRef);
    
    // const crosswordList = crosswordSnapshot.docs.map((doc) => ({
    //   id: doc.id,
    //   ...doc.data(),
    // }));
    // console.log("crosswordList size", crosswordList);
    // return crosswordList[0];
    console.log("got docSnap",docSnap.data())
    return docSnap.data()
  } catch (ex) {
    console.error("got error", ex);
    return;
  }
}
async function getAllCrosswords() {
  console.log("in getAllCrosswords");
  const crosswordCol = db
    .collection("crossword")
    .where("user.uid", "==", firebase.auth().currentUser.multiFactor.user.uid);
  try {
    const crosswordSnapshot = await crosswordCol.get();

    const crosswordList = crosswordSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    console.log("crosswordList", crosswordList);
    return crosswordList;
  } catch (ex) {
    console.error("got error", ex);
    return [];
  }
}

async function uploadScreenshot(id, imageDataUrl) {
  const storageRef = ref(storage, `screenshots/${id}/screenshot.jpg`);
  const res = await uploadString(storageRef, imageDataUrl, "data_url");
  return res;
}

async function getUrlForScreenshot(id) {
  const storageRef = ref(storage, `screenshots/${id}/screenshot.jpg`);
  const lnk = await getDownloadURL(storageRef);
  console.log("LNK", lnk);
  return lnk;
}

export {
  app,
  firebase,
  getAllCrosswords,
  getCrossword,
  saveNewCrossword,
  updateCrossword,
  uploadScreenshot,
  getUrlForScreenshot,
};
