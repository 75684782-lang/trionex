// js/config.js
const firebaseConfig = {
    apiKey: "AIzaSyC-q4b5vcvtzPcMlrFEthwGs5VkuzZHvKg",
    authDomain: "trionex-db.firebaseapp.com",
    databaseURL: "https://trionex-db-default-rtdb.firebaseio.com",
    projectId: "trionex-db",
    storageBucket: "trionex-db.firebasestorage.app",
    messagingSenderId: "578762600092",
    appId: "1:578762600092:web:8671f08c90f61015b6c759"
};

// Inicializar Firebase Globalmente
let db = null;
try {
    firebase.initializeApp(firebaseConfig);
    db = firebase.database();
    console.log("📡 Sistema Conectado");
} catch (e) {
    console.error("Error Config:", e);
}