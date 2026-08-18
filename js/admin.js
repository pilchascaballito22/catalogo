/* ========================================================= */
/* FORMATO DE PRECIO ARGENTINO */
/* ========================================================= */

const priceInput = document.getElementById("productPrice");

function formatPrice(value) {
  const numbers = String(value || "").replace(/\D/g, "");

  if (!numbers) {
    return "";
  }

  return Number(numbers).toLocaleString("es-AR");
}

function getRawPrice(value) {
  const numbers = String(value || "").replace(/\D/g, "");

  if (!numbers) {
    return 0;
  }

  return Number(numbers);
}

if (priceInput) {
  // Cambiamos number por text para permitir $ y puntos
  priceInput.type = "text";
  priceInput.inputMode = "numeric";
  priceInput.placeholder = "$35.000";

  priceInput.addEventListener("input", () => {
    const cursorPosition = priceInput.selectionStart;
    const oldValue = priceInput.value;

    const raw = oldValue.replace(/\D/g, "");

    if (!raw) {
      priceInput.value = "";
      return;
    }

    const formatted = Number(raw).toLocaleString("es-AR");

    priceInput.value = formatted;

    // Mantener el cursor al final
    priceInput.setSelectionRange(
      priceInput.value.length,
      priceInput.value.length
    );
  });
}
