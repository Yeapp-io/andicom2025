// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDocs, setDoc, doc, updateDoc, increment, runTransaction
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

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

const res = await fetch('./js/collections.json');
const dataInicial = await res.json();

async function cargarDatosIniciales() {
    try {
        const coctelesSnap = await getDocs(collection(db, "cocteles"));
        if (!coctelesSnap.empty) {
            console.log("⚠️ Los datos ya existen. No se cargan de nuevo.");
            return;
        }

        for (let coctel of dataInicial.cocteles) {
            await addDoc(collection(db, "cocteles"), coctel);
        }
        for (let pedido of dataInicial.pedidos) {
            await addDoc(collection(db, "pedidos"), pedido);
        }
        for (let cliente of dataInicial.clientes) {
            await addDoc(collection(db, "clientes"), cliente);
        }
        for (let contador of dataInicial.contadores) {
            await addDoc(collection(db, "contadores"), contador);
        }
        console.log("✅ Datos iniciales cargados");
    } catch (e) {
        console.error("❌ Error cargando datos iniciales:", e);
    }
}
cargarDatosIniciales();

export function initAppLogic() {
    // start() contiene toda la lógica que antes estaba dentro de DOMContentLoaded
    function start() {
        // Estado carrito
        const cart = new Map();

        const menuGrid = document.querySelector('.menu-grid');
        const pedidoTable = document.getElementById('pedido-table');
        const pedidoTBody = pedidoTable.querySelector('tbody');
        const pedidoVacio = document.getElementById('pedido-vacio');

        function getItemDataFromMenuEl(itemEl) {
            return {
                id: itemEl.dataset.id,
                nombre: itemEl.querySelector('.menu-name')?.textContent.trim() || '',
                descripcion: itemEl.querySelector('.menu-descripcion')?.textContent.trim() || '',
                imagen: itemEl.querySelector('img')?.getAttribute('src') || ''
            };
        }

        function changeQty(id, delta) {
            const current = cart.get(id)?.cantidad || 0;
            const next = Math.max(0, current + delta);

            if (!cart.has(id)) {
                const itemEl = document.querySelector(`.menu-item[data-id="${id}"]`);
                if (!itemEl) return;
                const data = getItemDataFromMenuEl(itemEl);
                data.cantidad = next;
                if (next > 0) cart.set(id, data);
            } else {
                const entry = cart.get(id);
                entry.cantidad = next;
                if (next === 0) cart.delete(id);
            }

            syncMenuQtyDisplays();
            renderPedidoTable();
        }

        function syncMenuQtyDisplays() {
            document.querySelectorAll('.menu-item').forEach(el => {
                const id = el.dataset.id;
                const q = cart.get(id)?.cantidad || 0;
                const display = el.querySelector('.qty-display');
                if (display) display.textContent = String(q);
            });
        }

        function renderPedidoTable() {
            pedidoTBody.innerHTML = '';
            let hasItems = false;

            for (const [, item] of cart) {
                const { id, nombre, descripcion, imagen, cantidad } = item;
                if (cantidad > 0) {
                    hasItems = true;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
            <td style="padding:1rem;border-bottom:1px solid #ccc;">
              <img src="${imagen}" alt="${nombre}" style="width:64px;height:64px;border-radius:8px;">
            </td>
            <td style="padding:1rem;border-bottom:1px solid #ccc;">${nombre}</td>
            <td style="display:none; padding:1rem;border-bottom:1px solid #ccc;">${descripcion}</td>
            <td style="padding:1rem;text-align:center;border-bottom:1px solid #ccc;">
              <div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;">
                <button type="button" class="btn-qty pedido-minus" data-id="${id}">−</button>
                <span class="qty-display">${cantidad}</span>
                <button type="button" class="btn-qty pedido-plus" data-id="${id}">+</button>
              </div>
            </td>
          `;
                    pedidoTBody.appendChild(tr);
                }
            }
            pedidoVacio.style.display = hasItems ? 'none' : 'block';
        }

        // Delegación: botones del menú (+ / −)
        menuGrid.addEventListener('click', (e) => {
            const btn = e.target.closest('[data-action="plus"], [data-action="minus"]');
            if (!btn) return;
            const itemEl = btn.closest('.menu-item');
            if (!itemEl) return;
            const id = itemEl.dataset.id;
            changeQty(id, btn.dataset.action === 'plus' ? +1 : -1);
        });

        // Delegación: botones en la tabla de pedido (+ / −)
        pedidoTable.addEventListener('click', (e) => {
            const btn = e.target.closest('.pedido-plus, .pedido-minus');
            if (!btn) return;
            const id = btn.dataset.id;
            if (!id) return;
            changeQty(id, btn.classList.contains('pedido-plus') ? +1 : -1);
        });

        // Navegación entre pestañas
        document.querySelectorAll('.nav-link').forEach(tab => {
            tab.addEventListener('click', function (ev) {
                ev.preventDefault();
                document.querySelectorAll('.nav-link').forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
                this.classList.add('active');
                const paneId = this.getAttribute('data-tab');
                const pane = document.getElementById(paneId);
                if (pane) pane.classList.add('active');
                document.body.className = 'bg-' + paneId;
                if (paneId === 'pedido') renderPedidoTable();
            });
        });

        document.getElementById('btn-menu')?.addEventListener('click', () => {
            const menuLink = document.querySelector('.nav-link[data-tab="menu"]');
            if (menuLink) menuLink.click();
        });

        // Guardar pedido en Firestore
        async function guardarPedido(pedido) {
            const docRef = await addDoc(collection(db, "pedidos"), pedido);
            console.log("✅ Pedido generado con ID:", docRef.id);

            // Guardar en localStorage
            localStorage.setItem(docRef.id, JSON.stringify(pedido));

            window.location.href = `./pedido.html?id=${docRef.id}`;

        }

        function getFechaActual() {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        }

        function finalizarPedido(pedido) {
            const url = `${window.location.origin}${window.location.pathname}?id=${pedido.id_pedido}`;
            QRCode.toCanvas(document.getElementById("qrcode"), url, { width: 300 });
        }

        document.getElementById('btn-generar-pedido').addEventListener('click', async () => {
            const cocteles = Array.from(cart.values()).map(({ id, nombre, cantidad, imagen, descripcion }) => ({ id, nombre, cantidad, imagen, descripcion }));

            if (cocteles.length === 0) {
                alert("⚠️ Debes seleccionar al menos un cóctel 🍸");
                return;
            }

            const pedido = {
                fecha: getFechaActual(),
                estado: 'Pendiente',
                turno: await generarTurno(),
                cocteles: Object.keys(cocteles).map(id => ({
                    id: cocteles[id].id,
                    nombre: cocteles[id].nombre,
                    cantidad: cocteles[id].cantidad,
                    imagen: cocteles[id].imagen,
                    descripcion: cocteles[id].descripcion,
                })),
            };

            await guardarPedido(pedido);
            finalizarPedido(pedido);

            // Ocultar botones + y -
            document.querySelectorAll('.pedido-plus, .pedido-minus').forEach(b => b.style.display = 'none');

            // alert('Pedido generado:\n' + JSON.stringify(pedido, null, 2));
        });
    } // end start()

    // Si document ya cargó, ejecutamos start inmediatamente; si no, esperamos DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
}


async function generarTurno() {
  // Colección "contadores", documento "general"
  const turnoDoc = doc(db, "contadores", "general");

  const nuevoTurno = await runTransaction(db, async (transaction) => {
    const docSnap = await transaction.get(turnoDoc);

    if (!docSnap.exists()) {
      // Si no existe el documento, lo creamos con turno = 1
      transaction.set(turnoDoc, { turno: 1 });
      return 1;
    }

    const actual = docSnap.data().turno || 0;
    const siguiente = actual + 1;
    transaction.update(turnoDoc, { turno: siguiente });
    return siguiente;
  });

  // Dar formato tipo A001, A002, etc.
  return `A${String(nuevoTurno).padStart(3, "0")}`;
}
