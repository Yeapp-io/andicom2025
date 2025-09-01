// Importamos Firebase
import { db } from "./firebaseConfig.js";
import { collection, addDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Apenas cargue la página empieza el temporizador
window.addEventListener("DOMContentLoaded", () => {
    setTimeout(() => {
        window.location.href = "index.html"; // Redirección
    }, 90 * 1000); // 90 segundos en milisegundos
});

const form = document.getElementById("registro-form");

form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const datos = new FormData(form);
    const usuario = {
        nombre: datos.get("nombre"),
        telefono: datos.get("telefono"),
        correo: datos.get("correo"),
        empresa: datos.get("empresa"),
        fechaRegistro: serverTimestamp()
    };

    try {
        await addDoc(collection(db, "clientes"), usuario);
        alert("✅ ¡Gracias por registrarte! Tu información fue guardada correctamente.");
        form.reset();
    } catch (error) {
        console.error("❌ Error al registrar cliente:", error);
        alert("Hubo un error al registrar, intenta nuevamente.");
    }
});
