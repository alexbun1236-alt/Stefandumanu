// === INIȚIALIZARE HARTĂ (Leaflet) ===
// Setăm centrul pe România inițial
const map = L.map('map', {
    zoomControl: false // Ascundem pe mobil pentru un UI mai curat
}).setView([45.9432, 24.9668], 7); 

// Adăugăm layer-ul de străzi (OpenStreetMap)
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
}).addTo(map);

// === VARIABILE GLOBALE DE STARE ===
let pinsLocked = true;
let isCtrlPressed = false;
let currentSelectedStore = null;

// Structură de date simulată (Va veni din Firebase)
let stores = [
    { id: 1, name: "Magazin Centru", lat: 44.4268, lng: 26.1025, status: "neinceput", day: "luni", defaultLat: 44.4268, defaultLng: 26.1025 },
    { id: 2, name: "Supermarket Nord", lat: 44.4750, lng: 26.0820, status: "rezolvat", day: "marti", defaultLat: 44.4750, defaultLng: 26.0820 }
];

let markers = {}; // Păstrăm referințe către pini pe hartă

// === RANDARE PINI PE HARTĂ ===
function renderPins(selectedDay) {
    // 1. Curățăm pinii vechi
    for (let id in markers) { map.removeLayer(markers[id]); }
    markers = {};

    // 2. Cerința 13: Filtrăm magazinele alocate în alte zile
    const visibleStores = stores.filter(store => {
        // Dacă e modul "Toate" sau ziua se potrivește, îl arătăm
        return store.day === selectedDay; 
        // Aici va interveni o logică mai avansată din Firebase pentru excluderi de categorii
    });

    visibleStores.forEach(store => {
        // Culoare dinamică în funcție de status
        const pinColor = store.status === 'rezolvat' ? 'green' : 'red'; 
        
        // Marker simplu nativ colorat (poți folosi imagini custom ulterior)
        const marker = L.marker([store.lat, store.lng], {
            draggable: !pinsLocked, // Cerința 10: Lock/Unlock
            title: store.name
        }).addTo(map);

        // Cerința 9: Drag & Drop Pini (Salvare automată)
        marker.on('dragend', function (e) {
            const newPos = e.target.getLatLng();
            store.lat = newPos.lat;
            store.lng = newPos.lng;
            console.log(`Pin mutat la: ${store.lat}, ${store.lng}`);
            // AICI: Apel funcție updateFirebase(store.id, {lat, lng})
            localStorage.setItem('localStores', JSON.stringify(stores));
        });

        // Click pe pin -> Deschide Quick-View (Cerința 5)
        marker.on('click', function(e) {
            L.DomEvent.stopPropagation(e); // Previne click-ul pe hartă
            openQuickView(store);
        });

        markers[store.id] = marker;
    });
}

// === INTERFAȚĂ: QUICK-VIEW (Cerința 5) ===
const quickView = document.getElementById('quick-view');
const qvTitle = document.getElementById('qv-title');
const qvWazeBtn = document.getElementById('qv-waze-btn');
const qvNotes = document.getElementById('qv-notes');

function openQuickView(store) {
    currentSelectedStore = store;
    qvTitle.innerText = store.name;
    qvNotes.value = localStorage.getItem(`notes_${store.id}`) || "";
    quickView.classList.remove('hidden');
    
    // Setează link Waze
    qvWazeBtn.onclick = () => {
        window.open(`https://waze.com/ul?ll=${store.lat},${store.lng}&navigate=yes`, '_blank');
    };
}

// Închide Quick-View dacă apasă oriunde pe hartă (Cerința 5)
map.on('click', function() {
    quickView.classList.add('hidden');
});

// Salvare automată a notițelor
qvNotes.addEventListener('input', (e) => {
    if(currentSelectedStore) {
        localStorage.setItem(`notes_${currentSelectedStore.id}`, e.target.value);
        // AICI: Sincronizare Firestore
    }
});

// === INTERFAȚĂ: LOCK/UNLOCK (Cerința 10) ===
const lockBtn = document.getElementById('lock-pins-btn');
lockBtn.addEventListener('click', () => {
    pinsLocked = !pinsLocked;
    lockBtn.innerText = pinsLocked ? "🔒" : "🔓";
    
    // Actualizăm starea de drag pentru toți pinii de pe hartă
    for (let id in markers) {
        if (pinsLocked) {
            markers[id].dragging.disable();
        } else {
            markers[id].dragging.enable();
        }
    }
});

// === FUNCȚIONALITATE CTRL + DRAG (Cerința 4 & 11) ===
document.addEventListener('keydown', (e) => {
    if (e.key === 'Control' || e.metaKey) {
        isCtrlPressed = true;
        document.getElementById('map').classList.add('crosshair-cursor');
    }
});
document.addEventListener('keyup', (e) => {
    if (e.key === 'Control' || e.metaKey) {
        isCtrlPressed = false;
        document.getElementById('map').classList.remove('crosshair-cursor');
    }
});
// (Logica de trasare rute polilinie cu Ctrl+Drag necesită ascultători pe mousedown/mousemove/mouseup pe hartă, care pot fi dezvoltați după confirmarea structurii).

// === FAB & MODAL (Cerința 6) ===
const fabBtn = document.getElementById('fab-btn');
const auditModal = document.getElementById('audit-modal');
const closeAuditBtn = document.getElementById('close-audit-btn');

fabBtn.addEventListener('click', () => auditModal.classList.remove('hidden'));
closeAuditBtn.addEventListener('click', () => auditModal.classList.add('hidden'));

// INIȚIALIZARE
renderPins('luni');