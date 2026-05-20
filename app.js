import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-check.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, onSnapshot, doc, setDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === 1. CONFIGURACIÓN ===
const firebaseConfig = {
  apiKey: "AIzaSyBRDW7x-4N3oC4ouiykHNNBrtRjCaJjQzo",
  authDomain: "asys-auto.firebaseapp.com",
  projectId: "asys-auto",
  storageBucket: "asys-auto.firebasestorage.app",
  messagingSenderId: "362622147160",
  appId: "1:362622147160:web:34401392b73da2793bc82d",
  measurementId: "G-1TBNP0GGYX"
};
const GEMINI_API_KEY = "AIzaSyA6KpuPhPmy8RMiBgrk0voLYbfmHmuYeTw"; // <--- PONES TU CLAVE DE GEMINI AQUÍ
const RECAPTCHA_SITE_KEY = "6LdE3OosAAAAALzMd8EpS2gkNU6JfG5KmZNv35E5";

// === 2. INICIALIZACIÓN SEGURA ===
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
setPersistence(auth, browserLocalPersistence);

// === 3. ESTADO ===
let user = null;
let historialCargas = [];
let estadoAuto = { tipoUso: "particular", combustibleComparativo: "Super 95", nombreUsuario: "", marcaModelo: "", matricula: "", capacidadBateria: 54.3, rendimientoAnterior: 12, nombreTaller: "", direccionTaller: "", telefonoTaller: "", precios: { hogarValle: 2.32, uteLenta: 7.54, uteRapida: 10.80, wallboxEspecial: 12.00 }, combustibles: { "Super 95": 88.03, "Premium 97": 90.09, "Gasoil 10S": 66.27, "Gasoil 50-S": 57.72 } };

// === 4. NOTIFICACIONES ===
function showNotification(msg, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl border text-xs font-semibold ${type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`;
    toast.innerHTML = msg;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// === 5. ESCUCHA DE AUTENTICACIÓN Y DATOS ===
onAuthStateChanged(auth, (u) => {
    if (u) {
        user = u;
        document.getElementById('login-screen')?.classList.add('hidden');
        document.getElementById('main-app')?.classList.remove('hidden');
        
        // Cargar Cargas
        onSnapshot(collection(db, 'users', user.uid, 'cargas'), (snap) => {
            historialCargas = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.fecha - a.fecha);
            renderizarApp();
        }, (err) => console.error("Error cargas:", err));

        // Cargar Config
        onSnapshot(doc(db, 'users', user.uid, 'config', 'general'), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                estadoAuto = { ...estadoAuto, ...data };
                renderizarApp();
            }
        });
    } else {
        document.getElementById('login-screen')?.classList.remove('hidden');
        document.getElementById('main-app')?.classList.add('hidden');
    }
});

// === 6. LÓGICA IA CON SEGURIDAD ===
window.preguntarIA = async () => {
    if (!GEMINI_API_KEY || GEMINI_API_KEY === "TU_API_KEY_AQUI") {
        showNotification("Error: Clave de API de Gemini no configurada.", "error");
        return;
    }
    // ... (El resto de la lógica de IA igual que antes)
};

// === 7. RENDERIZACIÓN Y DEMÁS FUNCIONES ===
window.renderizarApp = () => {
    // ... (Tus funciones de renderizado igual que antes)
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.loginGoogle = () => signInWithPopup(auth, new GoogleAuthProvider());
window.logout = () => signOut(auth).then(() => location.reload());
window.toggleConfig = () => document.getElementById('modal-config').classList.toggle('hidden');
// ... (resto de funciones)
