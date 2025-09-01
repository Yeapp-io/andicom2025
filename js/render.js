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

    // Convertir snapshot a array con doc.id incluido
    const cocteles = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
    }));

    // Ordenar por id_coctel
    cocteles.sort((a, b) => a.id_coctel - b.id_coctel);

    // Renderizar cada cóctel en el grid
    cocteles.forEach(coctel => {
        const item = document.createElement('div');
        item.className = 'menu-item';
        item.setAttribute('data-id', coctel.id);

        // Si no hay stock, mostramos un mensaje
        const actionsHTML = coctel.disponibles && coctel.disponibles > 0
            ? `
                <div class="menu-actions">
                    <button class="btn-qty" data-action="minus">−</button>
                    <span class="qty-display">0</span>
                    <button class="btn-qty" data-action="plus">+</button>
                </div>
              `
            : `<p class="sin-stock" style="color: red; font-weight: bold; font-size: 1.5rem; margin-top: 4rem;">Producto no disponible en este momento</p>`;

        item.innerHTML = `
            <h3 class="menu-name banner-title-menu" style="margin: 2rem 0;">${coctel.nombre}</h3>
            <img class="img-aliado" style="height: 100px;" src="${coctel.aliado || './img/default.jpg'}" alt="${coctel.nombre}">
            <img class="img-product" src="${coctel.imagen || './img/default.jpg'}" alt="${coctel.nombre}">
            <p class="menu-descripcion" style="font-size: 2rem; margin: 0 0.5rem;">${coctel.descripcion || ''}</p>
            ${actionsHTML}
        `;

        menuGrid.appendChild(item);
    });
}

