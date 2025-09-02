// main.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
    getFirestore, collection, addDoc, getDoc, getDocs, setDoc, doc, updateDoc, increment, runTransaction
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
                aliado: itemEl.querySelector('.img-aliado')?.getAttribute('src') || '',
                nombre: itemEl.querySelector('.menu-name')?.textContent.trim() || '',
                descripcion: itemEl.querySelector('.menu-descripcion')?.textContent.trim() || '',
                imagen: itemEl.querySelector('.img-product')?.getAttribute('src') || ''
            };
        }

        function changeQty(id, delta) {
            const current = cart.get(id)?.cantidad || 0;
            const desired = Math.max(0, current + delta); // cantidad que queremos tener

            // Regla 1: no más de 2 por producto
            if (desired > 2) {
                // alert("⚠️ Solo puedes pedir hasta 2 unidades de cada cóctel.");
                Swal.fire({
                    icon: 'warning',
                    title: '⚠️ Límite alcanzado',
                    text: 'Solo puedes pedir hasta 2 unidades de cada cóctel.',
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            // Regla 2: no más de 2 cócteles en total
            // Calculamos el total después del cambio de manera robusta:
            const totalActual = [...cart.values()].reduce((acc, c) => acc + c.cantidad, 0);
            const totalDespues = totalActual - current + desired;
            if (totalDespues > 2) {
                // alert("⚠️ Solo puedes pedir hasta 2 cócteles en total por pedido.");
                Swal.fire({
                    icon: 'warning',
                    title: '⚠️ Límite alcanzado',
                    text: 'Solo puedes pedir hasta 2 unidades de cada cóctel.',
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            // Aplicar la actualización en el carrito (solo 1 vez)
            if (desired === 0) {
                cart.delete(id);
            } else if (cart.has(id)) {
                cart.get(id).cantidad = desired;
            } else {
                // tomamos datos desde el DOM si no existía el item
                const itemEl = document.querySelector(`.menu-item[data-id="${id}"]`);
                const data = itemEl ? getItemDataFromMenuEl(itemEl) : { id, nombre: '', aliado: '', imagen: '', descripcion: '' };
                data.cantidad = desired;
                cart.set(id, data);
            }

            // actualizar vistas
            syncMenuQtyDisplays();
            renderPedidoTable();
            updateFixedButtonVisibility();
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
                const { id, nombre, aliado, imagen, descripcion, cantidad } = item;
                if (cantidad > 0) {
                    hasItems = true;
                    const tr = document.createElement('tr');
                    tr.innerHTML = `
            <td style="padding:1rem;border-bottom:1px solid #ccc;">
              <img width:"300px" src="${imagen}" alt="${nombre}" style="width:200px;height:200px;border-radius:8px;">
            </td>
            
            <td style="padding:1rem;border-bottom:1px solid #ccc;">
                <p style="text-align: center;">${nombre}</p>
                <img src="${aliado}" alt="${nombre}" style="width:200px;border-radius:8px;">
              
            </td>
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
            updateFixedButtonVisibility();
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

        // Btn fijo para generar pedido
        // --- Button fijo: mostrar solo cuando estemos en la pestaña 'menu'
        const fixedBtn = document.getElementById('btn-ir-pedido');
        const fixedBtnQty = document.getElementById('btn-pedido-cantidad');

        function updateFixedButtonVisibility() {
            if (!fixedBtn) return;

            // calcular total de cócteles en el carrito
            const totalItems = [...cart.values()].reduce((acc, item) => acc + item.cantidad, 0);

            // actualizar siempre el número
            if (fixedBtnQty) {
                fixedBtnQty.textContent = totalItems;
            }

            const activeTab = document.querySelector('.nav-link.active')?.dataset.tab;
            if (activeTab === 'menu' && totalItems > 0) {
                fixedBtn.style.display = 'flex';  // se muestra el botón fijo
            } else {
                fixedBtn.style.display = 'none';  // se oculta
            }
        }


        // Llamar al inicio para tener el estado correcto al cargar
        updateFixedButtonVisibility();

        // Asegurar que cada cambio de pestaña actualice la visibilidad
        //  justo después de activar la pane. Si prefieres no editarlo, añade otro listener:)
        document.querySelectorAll('.nav-link').forEach(tab => {
            tab.addEventListener('click', () => {
                // tiny defer para asegurar que la clase .active ya haya sido aplicada por el otro handler
                setTimeout(updateFixedButtonVisibility, 0);
            });
        });

        // Al hacer click en el botón fijo, vamos a la pestaña pedido
        fixedBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            const pedidoLink = document.querySelector('.nav-link[data-tab="pedido"]');
            if (pedidoLink) pedidoLink.click();
        });


        // Guardar pedido en Firestore
        async function guardarPedido(pedido) {
            try {
                // Verificar si hay suficiente stock para todos los cocteles en el pedido
                const stockSuficiente = await verificarStock(pedido.cocteles);
                if (!stockSuficiente) {
                    //alert("⚠️ No hay suficiente stock para algunos de los cócteles en tu pedido.");
                    Swal.fire({
                        icon: 'error',
                        title: '🚫 Stock insuficiente',
                        text: 'No hay suficiente stock para algunos de los cócteles en tu pedido.',
                        confirmButtonText: 'Ok'
                    });
                    return;
                }

                // Si el stock es suficiente, generar el pedido en Firestore
                const docRef = await addDoc(collection(db, "pedidos"), pedido);
                await descontarStock(pedido); // Descontar el stock
                // cerrar el "loading"
                Swal.close();
                console.log("✅ Pedido generado con ID:", docRef.id);
                // Guardar en localStorage
                localStorage.setItem(docRef.id, JSON.stringify(pedido));
                // mostrar confirmación
                Swal.fire({
                    icon: 'success',
                    title: '✅ Pedido generado',
                    text: 'Tu pedido fue registrado con éxito. 🍸',
                    timer: 3000,               
                    timerProgressBar: true,    
                    showConfirmButton: false
                }).then(() => {
                    window.location.href = `./pedido.html?id=${docRef.id}`;
                });


            } catch (error) {
                console.error("Error al guardar el pedido:", error);
                Swal.close();
                Swal.fire({
                    icon: 'error',
                    title: '❌ Error',
                    text: 'Hubo un problema al generar tu pedido. Intenta de nuevo.'
                });

            }

        }

        function getFechaActual() {
            const now = new Date();
            const pad = (n) => String(n).padStart(2, '0');
            return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
        }

        function finalizarPedido(pedido) {
            const url = `${window.location.origin}${window.location.pathname}?id=${pedido.id_pedido}`;
        }

        document.getElementById('btn-generar-pedido').addEventListener('click', async () => {
            const cocteles = Array.from(cart.values()).map(({ id, nombre, aliado, imagen, descripcion, cantidad }) => ({ id, nombre, aliado, imagen, descripcion, cantidad }));

            if (cocteles.length === 0) {
                //alert("⚠️ Debes seleccionar al menos un cóctel 🍸");
                Swal.fire({
                    icon: 'info',
                    title: '🍸 Selección requerida',
                    text: 'Debes seleccionar al menos un cóctel.',
                    confirmButtonText: 'Entendido'
                });
                return;
            }

            const pedido = {
                fecha: getFechaActual(),
                estado: 'Pendiente',
                turno: await generarTurno(),
                cocteles: Object.keys(cocteles).map(coctel => ({
                    id: cocteles[coctel].id,
                    nombre: cocteles[coctel].nombre,
                    aliado: cocteles[coctel].aliado,
                    imagen: cocteles[coctel].imagen,
                    descripcion: cocteles[coctel].descripcion,
                    cantidad: cocteles[coctel].cantidad,
                })),
            };
            console.log("Esto es pedido ** ", pedido);
            // Dentro de tu función guardarPedido o antes de llamarla
            Swal.fire({
                title: 'Procesando tu pedido 🍹',
                text: 'Por favor espera un momento...',
                allowOutsideClick: false,
                allowEscapeKey: false,
                didOpen: () => {
                    Swal.showLoading(); // 🔄 muestra spinner
                }
            });
            await guardarPedido(pedido);
            finalizarPedido(pedido);
        });
    } // end start()

    // Si document ya cargó, ejecutamos start inmediatamente; si no, esperamos DOMContentLoaded
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', start);
    } else {
        start();
    }
}

// Función para verificar stock antes de generar un pedido
async function verificarStock(cocteles) {
    try {
        // Verificar el stock de cada cóctel
        for (const coctel of cocteles) {
            const docRef = doc(db, "cocteles", coctel.id);
            const docSnap = await getDoc(docRef);

            if (!docSnap.exists()) {
                console.error("❌ No se encontró el cóctel con ID:", coctel.id);
                return false; // Si algún cóctel no existe, no continuar
            }

            const data = docSnap.data();
            const stockDisponible = data.disponibles || 0;

            if (stockDisponible < coctel.cantidad) {
                console.log(`❌ No hay suficiente stock de ${coctel.nombre}. Solo hay ${stockDisponible} disponibles.`);
                return false; // Si no hay suficiente stock, retorna false
            }
        }

        return true; // Si todos los cócteles tienen suficiente stock
    } catch (error) {
        console.error("Error al verificar el stock:", error);
        return false;
    }
}

// Función para descontar stock después de generar un pedido
async function descontarStock(pedido) {
    console.log("Esto llega a descontarStock/ pedido", pedido);

    try {
        for (const item of pedido.cocteles) {
            const coctelRef = doc(db, "cocteles", item.id);
            const coctelSnap = await getDoc(coctelRef);

            if (coctelSnap.exists()) {
                const coctelData = coctelSnap.data();
                const stockActual = coctelData.disponibles ?? 0;

                if (stockActual >= item.cantidad) {
                    const nuevoStock = stockActual - item.cantidad;

                    await updateDoc(coctelRef, {
                        disponibles: nuevoStock
                    });

                    console.log(`✅ Stock actualizado: ${coctelData.nombre} ahora tiene ${nuevoStock} disponibles`);
                } else {
                    console.warn(`⚠️ No hay suficiente stock para ${coctelData.nombre}. Stock actual: ${stockActual}, Pedido: ${item.cantidad}`);
                    //alert(`⚠️ No hay suficiente stock para ${coctelData.nombre}. Stock actual: ${stockActual}, Pedido: ${item.cantidad}`)
                    Swal.fire({
                        icon: 'error',
                        title: `⚠️ Stock insuficiente`,
                        html: `No hay suficiente stock para <b>${coctelData.nombre}</b>.<br>
                                Stock actual: <b>${stockActual}</b><br>
                                Pedido: <b>${item.cantidad}</b>`,
                        confirmButtonText: 'Ok'
                    });
                }
            }
        }
    } catch (error) {
        console.error("❌ Error al descontar stock:", error);
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
