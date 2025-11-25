// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBq0PvSp-00mcbHhWtiCDK9SCtGDVikTL4",
  authDomain: "msi-tracker.firebaseapp.com",
  projectId: "msi-tracker",
  storageBucket: "msi-tracker.firebasestorage.app",
  messagingSenderId: "486848526130",
  appId: "1:486848526130:web:1fced54f6baa99aa91092b",
  measurementId: "G-2B53VF2S75"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);