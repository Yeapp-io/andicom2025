// render.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyBXuxvb6yQgK9UYI7s9Ez89L2btjVypyQs",
    authDomain: "app-cocteles-56536.firebaseapp.com",
    projectId: "app-cocteles-56536",
    storageBucket: "app-cocteles-56536.appspot.com",
    messagingSenderId: "137807744816",
    appId: "1:137807744816:web:61fcba05330f2a128d02f5",
    measurementId: "G-ZSCCQ6919V"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export async function renderCocteles() {
    const menuGrid = document.querySelector('#menu .menu-grid');
    menuGrid.innerHTML = "";

    const snapshot = await getDocs(collection(db, "cocteles"));
    snapshot.forEach(doc => {
        const coctel = doc.data();
        const item = document.createElement('div');
        item.className = 'menu-item';
        const id = doc.id;
        item.setAttribute('data-id', id);
        item.innerHTML = `
      <h3 class="menu-name banner-title-menu" style="margin: 2rem 0;">${coctel.nombre}</h3>
      <img style="height: 100px;" src="${coctel.aliado || './img/default.jpg'}" alt="${coctel.nombre}">
      <img src="${coctel.imagen || './img/default.jpg'}" alt="${coctel.nombre}">
      <p  class="menu-descripcion" style="font-size: 2rem; margin: 0 0.5rem;">${coctel.descripcion || ''}</p>
      <div class="menu-actions">
        <button class="btn-qty" data-action="minus">−</button>
        <span class="qty-display">0</span>
        <button class="btn-qty" data-action="plus">+</button>
      </div>
    `;
        menuGrid.appendChild(item);
    });
}

// Auto-render al cargar
// renderCocteles();

