

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDq4gJqSOKwJWvh_g08qRmdwSdFZsiu460",
  authDomain: "fussball-manager-fbc3b.firebaseapp.com",
  projectId: "fussball-manager-fbc3b",
  storageBucket: "fussball-manager-fbc3b.firebasestorage.app",
  messagingSenderId: "963475864768",
  appId: "1:963475864768:web:effce8b08f1f9abf354125",
  measurementId: "G-SH9EB39MN1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);