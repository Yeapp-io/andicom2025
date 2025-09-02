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
        nombre: datos.get("nombre").trim(),
        telefono: datos.get("telefono").trim(),
        correo: datos.get("correo").trim(),
        empresa: datos.get("empresa").trim(),
        fechaRegistro: serverTimestamp()
    };

    // 🔹 Validaciones antes de guardar
    if (usuario.nombre.length < 3) {
        return Swal.fire("⚠️ Atención", "El nombre debe tener al menos 3 caracteres.", "warning");
    }

    if (!/^[0-9]{7,15}$/.test(usuario.telefono)) {
        return Swal.fire("⚠️ Atención", "El teléfono debe tener entre 7 y 15 dígitos.", "warning");
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(usuario.correo)) {
        return Swal.fire("⚠️ Atención", "El correo electrónico no es válido.", "warning");
    }

    if (usuario.empresa.length < 2) {
        return Swal.fire("⚠️ Atención", "El nombre de la empresa es demasiado corto.", "warning");
    }

    try {
        await addDoc(collection(db, "clientes"), usuario);

        Swal.fire({
            icon: "success",
            title: "¡Registro exitoso! 🎉",
            text: "✅ Gracias por registrarte, hemos guardado tu información correctamente.",
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true
        }).then(() => {
            window.location.href = "./index.html";
        });

        form.reset();
    } catch (error) {
        console.error("❌ Error al registrar cliente:", error);

        Swal.fire({
            icon: "error",
            title: "¡Ups! 😕",
            text: "Hubo un error al registrar. Por favor, intenta nuevamente.",
            timer: 3000,
            timerProgressBar: true,
            showConfirmButton: false
        });
    }
});
