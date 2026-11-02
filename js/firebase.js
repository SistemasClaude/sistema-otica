// Liga o app ao Firebase. Enquanto a configuração não for colada, tudo roda no MODO DEMONSTRAÇÃO (js/demo.js),
// com dados de exemplo só neste navegador.
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import * as fs from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import * as fa from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import * as demo from "./demo.js";
import { firebaseConfig, EMAIL_DA_OTICA } from "./firebase-config.js";

export const configurado = !String(firebaseConfig.apiKey).startsWith("COLE");
export const demonstracao = !configurado;
const app = configurado ? initializeApp(firebaseConfig) : null;
export const db = app ? fs.getFirestore(app) : demo.db;
export const auth = app ? fa.getAuth(app) : demo.auth;
export const emailDona = EMAIL_DA_OTICA.trim().toLowerCase();
export const recomecarDemonstracao = demo.recomecarDemonstracao;

const de = (real, nome) => (configurado ? real[nome] : demo[nome]);

export const collection = de(fs, "collection");
export const doc = de(fs, "doc");
export const query = de(fs, "query");
export const where = de(fs, "where");
export const orderBy = de(fs, "orderBy");
export const limit = de(fs, "limit");
export const onSnapshot = de(fs, "onSnapshot");
export const getDoc = de(fs, "getDoc");
export const getDocs = de(fs, "getDocs");
export const setDoc = de(fs, "setDoc");
export const updateDoc = de(fs, "updateDoc");
export const deleteDoc = de(fs, "deleteDoc");
export const addDoc = de(fs, "addDoc");
export const writeBatch = de(fs, "writeBatch");
export const runTransaction = de(fs, "runTransaction");
export const serverTimestamp = de(fs, "serverTimestamp");
export const arrayUnion = de(fs, "arrayUnion");

export const onAuthStateChanged = de(fa, "onAuthStateChanged");
export const signInWithEmailAndPassword = de(fa, "signInWithEmailAndPassword");
export const sendPasswordResetEmail = de(fa, "sendPasswordResetEmail");
export const signOut = de(fa, "signOut");
