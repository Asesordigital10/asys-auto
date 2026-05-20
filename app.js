import { initializeApp } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-analytics.js";
import { initializeAppCheck, ReCaptchaV3Provider } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-app-check.js";
import { getAuth, onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, setDoc, deleteDoc, getDocs } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

// === 1. PARÁMETROS DE CONEXIÓN FIREBASE ===
const firebaseConfig = {
  apiKey: "AIzaSyBRDW7x-4N3oC4ouiykHNNBrtRjCaJjQzo",
  authDomain: "asys-auto.firebaseapp.com",
  projectId: "asys-auto",
  storageBucket: "asys-auto.firebasestorage.app",
  messagingSenderId: "362622147160",
  appId: "1:362622147160:web:34401392b73da2793bc82d",
  measurementId: "G-1TBNP0GGYX"
};

const RECAPTCHA_SITE_KEY = "6LdE3OosAAAAALzMd8EpS2gkNU6JfG5KmZNv35E5";

// === 2. INICIALIZACIÓN ===
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
try { getAnalytics(app); } catch (e) {}
setPersistence(auth, browserLocalPersistence);

try {
    initializeAppCheck(app, {
        provider: new ReCaptchaV3Provider(RECAPTCHA_SITE_KEY),
        isTokenAutoRefreshEnabled: true
    });
} catch (e) {}

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

// === 3. RUTAS DE BASE DE DATOS ===
const getPublicCollection = (collectionName) => collection(db, collectionName);
const getUserCollection = (collectionName) => user ? collection(db, 'users', user.uid, collectionName) : null;
const getUserConfigDoc = () => user ? doc(db, 'users', user.uid, 'config', 'general') : null;

// === 4. VARIABLES DE ESTADO ===
let user = null;
let historialCargas = [];
let fotoBase64 = null;
let estadoAuto = { 
    tipoUso: "particular", combustibleComparativo: "Super 95",
    nombreUsuario: "", marcaModelo: "", matricula: "",
    capacidadBateria: 54.3, rendimientoAnterior: 12,
    nombreTaller: "", direccionTaller: "", telefonoTaller: "",
    precios: { hogarValle: 2.32, uteLenta: 7.54, uteRapida: 10.80, wallboxEspecial: 12.00 },
    combustibles: { "Super 95": 88.03, "Premium 97": 90.09, "Gasoil 10S": 66.27, "Gasoil 50-S": 57.72 }
};

// === 5. NOTIFICACIONES ===
function showNotification(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-2xl border text-xs font-semibold flex items-center gap-3 shadow-xl transition-all ${type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'}`;
    toast.innerHTML = `<span class="flex-1">${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

// === 6. AUTENTICACIÓN ===
onAuthStateChanged(auth, (u) => {
    if (u) {
        user = u;
        document.getElementById('login-screen')?.classList.add('hidden');
        document.getElementById('main-app')?.classList.remove('hidden');
        onSnapshot(getUserCollection('cargas'), (snap) => {
            historialCargas = snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => b.fecha - a.fecha);
            renderizarApp();
        });
        onSnapshot(getUserConfigDoc(), (snap) => {
            if (snap.exists()) {
                const data = snap.data();
                estadoAuto = { ...estadoAuto, ...data, precios: { ...estadoAuto.precios, ...data.precios }, combustibles: { ...estadoAuto.combustibles, ...data.combustibles } };
                renderizarApp();
            }
        });
    } else {
        document.getElementById('login-screen')?.classList.remove('hidden');
        document.getElementById('main-app')?.classList.add('hidden');
    }
});

// === 7. FUNCIONES DE CÁLCULO ===
const calcularCostoReal = (kwh, tarifa) => {
    const p = estadoAuto.precios;
    const k = parseFloat(kwh) || 0;
    const esPro = estadoAuto.tipoUso === 'profesional';
    if (tarifa === 'uteRapida') return (k * p.uteRapida) + (esPro ? 0 : 121.9);
    if (tarifa === 'uteLenta') return (k * p.uteLenta) + (esPro ? 0 : 40);
    if (tarifa === 'hogarValle') return (k * p.hogarValle * 1.22);
    return (k * p.wallboxEspecial * 1.22);
};

window.actualizarPreview = () => {
    const inicio = parseFloat(document.getElementById('bat-inicio')?.value) || 0;
    const fin = parseFloat(document.getElementById('bat-fin')?.value) || 0;
    const tarifa = document.getElementById('tipo-tarifa')?.value;
    if (fin > inicio) {
        const kwh = ((fin - inicio) / 100) * (estadoAuto.capacidadBateria || 54.3);
        document.getElementById('preview-costo').innerHTML = `<b>${kwh.toFixed(1)} kWh</b> | <b class="text-white">$ ${calcularCostoReal(kwh, tarifa).toFixed(0)}</b>`;
    }
};

window.registrarCarga = async (e) => {
    e.preventDefault();
    const km = parseFloat(document.getElementById('km').value) || 0;
    const inicio = parseFloat(document.getElementById('bat-inicio').value) || 0;
    const fin = parseFloat(document.getElementById('bat-fin').value) || 0;
    const tarifa = document.getElementById('tipo-tarifa').value;
    const kwh = ((fin - inicio) / 100) * (estadoAuto.capacidadBateria || 54.3);
    const costo = calcularCostoReal(kwh, tarifa);
    await addDoc(getUserCollection('cargas'), { fecha: Date.now(), km, batIn: inicio, batFin: fin, kwhTotales: kwh, costo, tarifaLabel: tarifa, esCien: document.getElementById('es-cien').checked });
    showNotification("Carga guardada.", "success");
};

// === 8. MOTOR IA (RAG CON RESPUESTA CONCRETA) ===
async function llamarGemini(prompt, fotoBase64, sistema) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=`; // Tu Key va aquí
    const payload = {
        contents: [{ parts: [{ text: prompt }, ...(fotoBase64 ? [{ inlineData: { mimeType: "image/jpeg", data: fotoBase64 } }] : [])] }],
        systemInstruction: { parts: [{ text: sistema }] }
    };
    const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
}

window.preguntarIA = async () => {
    const prompt = document.getElementById('input-busqueda')?.value;
    const sug = document.getElementById('sugerencias-manual');
    if (!prompt && !fotoBase64) return;
    
    sug.innerHTML = `<p class='text-blue-400 text-xs animate-pulse'>Consultando base de datos...</p>`;

    try {
        const snap = await getDocs(getPublicCollection('conocimiento_autos'));
        const manualContexto = snap.docs
            .map(d => d.data())
            .filter(d => d.modelo?.toLowerCase().includes(estadoAuto.marcaModelo?.toLowerCase() || ""))
            .map(d => d.contenido)
            .join("\n");

        const sistemaInst = `Eres un técnico experto en ${estadoAuto.marcaModelo}. 
        REGLA ESTRICTA: Responde ÚNICAMENTE a la pregunta del usuario basándote en el manual. 
        NO expliques el manual completo. NO des introducciones largas. 
        Sé directo, técnico y conciso. Si la info no está en el manual, dilo.`;
        
        const instrucciones = `Manual: ${manualContexto}\n\nPregunta: ${prompt}`;
        const respuesta = await llamarGemini(instrucciones, fotoBase64, sistemaInst);
        
        sug.innerHTML = `<div class="bg-blue-900/20 p-4 rounded-2xl border border-blue-500/20 text-sm">${respuesta.replace(/\n/g, '<br>')}</div>`;
    } catch (err) {
        sug.innerHTML = `<p class="text-red-400 text-xs">Error de sistema.</p>`;
    }
};

// === 9. RENDERIZACIÓN Y UTILIDADES ===
window.renderizarApp = () => {
    document.getElementById('user-display-name').innerText = estadoAuto.nombreUsuario || user?.displayName || "Propietario EV";
    // ... (resto de funciones de UI igual)
    if(typeof lucide !== 'undefined') lucide.createIcons();
};

window.loginGoogle = () => signInWithPopup(auth, provider);
window.logout = () => signOut(auth).then(() => location.reload());
window.toggleConfig = () => document.getElementById('modal-config').classList.toggle('hidden');
window.previsualizarFoto = () => { /* ... */ };
window.quitarFoto = () => { fotoBase64 = null; document.getElementById('container-preview').classList.add('hidden'); };
window.cambiarCombustible = async (t) => await setDoc(getUserConfigDoc(), { combustibleComparativo: t }, { merge: true });
window.eliminarRegistro = (id) => deleteDoc(doc(db, 'users', user.uid, 'cargas', id));
window.solicitarService = () => window.open(`https://wa.me/${estadoAuto.telefonoTaller}?text=Hola, service para ${estadoAuto.marcaModelo}`);
window.exportarExcel = () => { /* ... */ };
window.populateMockManuals = async (e) => { /* ... */ };
window.guardarConfig = async (e) => { /* ... */ };
window.onload = () => { if(typeof lucide !== 'undefined') lucide.createIcons(); };
