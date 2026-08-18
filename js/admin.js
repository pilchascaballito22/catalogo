import { supabase, supabaseReady } from "./supabase.js";

const $ = (selector) => document.querySelector(selector);

const state = {
  products: [],
  editingId: null,
  existingImages: []
};

/* =========================================================
   INICIO
========================================================= */

document.addEventListener("DOMContentLoaded", async () => {
  setupEvents();

  if (!supabase) {
    const error = $("#loginError");

    if (error) {
      error.textContent =
        "Configurá correctamente Supabase en js/supabase.js.";
    }

    return;
  }

  try {
    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session) {
      await showApp();
    } else {
      showAuth();
    }

    supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session) {
        await showApp();
      } else {
        showAuth();
      }
    });
  } catch (error) {
    console.error(error);

    const loginError = $("#loginError");

    if (loginError) {
      loginError.textContent =
        "No se pudo conectar con el sistema.";
    }
  }
});


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {

  // Login
  $("#loginForm")?.addEventListener("submit", login);

  // Logout
  $("#logoutBtn")?.addEventListener("click", async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error(error);
    }
  });

  // Nuevo producto
  $("#newProductBtn")?.addEventListener("click", () => {
    openEditor();
  });

  // Guardar producto
  $("#productForm")?.addEventListener("submit", saveProduct);

  // Fotos
  $("#productImages")?.addEventListener("change", previewNewFiles);

  // Buscar
  $("#searchProducts")?.addEventListener("input", renderProducts);

  /*
    IMPORTANTE:
    El HTML tiene type="number" para el precio.
    Si el usuario escribe 178.900, el navegador puede
    considerarlo inválido.

    Acá lo convertimos automáticamente a 178900.
  */
  $("#productPrice")?.addEventListener("input", (e) => {

    let value = e.target.value;

    // Dejar solamente números
    value = value.replace(/[^\d]/g, "");

    e.target.value = value;
  });

  // Clicks generales
  document.addEventListener("click", (e) => {

    // Cerrar modal
    if (e.target.matches("[data-close-editor]")) {
      closeEditor();
      return;
    }

    // Editar
    const editButton = e.target.closest("[data-edit]");

    if (editButton) {
      openEditor(editButton.dataset.edit);
      return;
    }

    // Eliminar
    const deleteButton = e.target.closest("[data-delete]");

    if (deleteButton) {
      deleteProduct(deleteButton.dataset.delete);
      return;
    }
  });
}


/* =========================================================
   LOGIN
========================================================= */

async function login(e) {

  e.preventDefault();

  const errorElement = $("#loginError");

  if (errorElement) {
    errorElement.textContent = "";
  }

  const email = $("#email")?.value.trim();
  const password = $("#password")?.value;

  if (!email || !password) {

    if (errorElement) {
      errorElement.textContent =
        "Completá email y contraseña.";
    }

    return;
  }

  const button = e.submitter;

  if (button) {
    button.disabled = true;
    button.textContent = "Ingresando...";
  }

  try {

    const { error } =
      await supabase.auth.signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

  } catch (error) {

    console.error(error);

    if (errorElement) {
      errorElement.textContent =
        traducirErrorLogin(error);
    }

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent = "Ingresar →";
    }
  }
}


/* =========================================================
   ERRORES DE LOGIN
========================================================= */

function traducirErrorLogin(error) {

  const message = String(error?.message || "").toLowerCase();

  if (
    message.includes("invalid login credentials") ||
    message.includes("invalid credentials")
  ) {
    return "Email o contraseña incorrectos.";
  }

  if (message.includes("email not confirmed")) {
    return "Tenés que confirmar el email de la cuenta.";
  }

  if (message.includes("too many requests")) {
    return "Demasiados intentos. Esperá unos minutos.";
  }

  return error?.message || "No se pudo iniciar sesión.";
}


/* =========================================================
   MOSTRAR APP
========================================================= */

async function showApp() {

  $("#authView")?.classList.add("hidden");
  $("#appView")?.classList.remove("hidden");

  await loadProducts();
}


/* =========================================================
   MOSTRAR LOGIN
========================================================= */

function showAuth() {

  $("#authView")?.classList.remove("hidden");
  $("#appView")?.classList.add("hidden");
}


/* =========================================================
   CARGAR PRODUCTOS
========================================================= */

async function loadProducts() {

  try {

    const {
      data,
      error
    } = await supabase
      .from("products")
      .select("*")
      .order("created_at", {
        ascending: false
      });

    if (error) {
      throw error;
    }

    state.products = data || [];

    updateStats();
    renderProducts();

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "No se pudieron cargar los productos."
    );
  }
}


/* =========================================================
   ESTADÍSTICAS
========================================================= */

function updateStats() {

  const total = state.products.length;

  const active = state.products.filter(
    (product) => product.active
  ).length;

  const featured = state.products.filter(
    (product) => product.featured
  ).length;

  if ($("#totalProducts")) {
    $("#totalProducts").textContent = total;
  }

  if ($("#activeProducts")) {
    $("#activeProducts").textContent = active;
  }

  if ($("#featuredProducts")) {
    $("#featuredProducts").textContent = featured;
  }
}


/* =========================================================
   MOSTRAR PRODUCTOS
========================================================= */

function renderProducts() {

  const searchInput = $("#searchProducts");

  const query = (
    searchInput?.value || ""
  )
    .toLowerCase()
    .trim();

  const list = state.products.filter((product) => {

    const text = `
      ${product.name || ""}
      ${product.category || ""}
      ${product.description || ""}
    `.toLowerCase();

    return text.includes(query);
  });

  const container = $("#adminProducts");

  if (!container) {
    return;
  }

  if (!list.length) {

    container.innerHTML = `
      <div class="loading">
        No hay productos.
      </div>
    `;

    return;
  }

  container.innerHTML = list
    .map(adminCard)
    .join("");
}


/* =========================================================
   CARD ADMIN
========================================================= */

function adminCard(product) {

  const image =
    Array.isArray(product.images)
      ? product.images[0] || ""
      : "";

  const status =
    product.active
      ? "· publicado"
      : "· oculto";

  return `
    <article class="admin-product">

      <div class="admin-product-image">
        ${
          image
            ? `
              <img
                src="${escapeAttr(image)}"
                alt="${escapeAttr(product.name || "")}"
              >
            `
            : ""
        }
      </div>

      <div class="admin-product-data">

        <small>
          ${escapeHtml(
            product.category || "Indumentaria"
          )}
          ${status}
        </small>

        <h3>
          ${escapeHtml(product.name || "Sin nombre")}
        </h3>

        <p>
          ${formatPrice(product.price)}
        </p>

        <div class="admin-product-actions">

          <button
            class="small-btn"
            type="button"
            data-edit="${escapeAttr(product.id)}"
          >
            Editar
          </button>

          <button
            class="small-btn delete"
            type="button"
            data-delete="${escapeAttr(product.id)}"
          >
            Eliminar
          </button>

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   ABRIR EDITOR
========================================================= */

function openEditor(id = null) {

  state.editingId = id;
  state.existingImages = [];

  const form = $("#productForm");

  if (form) {
    form.reset();
  }

  $("#productId").value = "";
  $("#previewImages").innerHTML = "";
  $("#photoCount").textContent = "0 fotos";
  $("#formError").textContent = "";

  if (id) {

    const product = state.products.find(
      (item) => String(item.id) === String(id)
    );

    if (!product) {
      return;
    }

    $("#editorTitle").textContent =
      "Editar producto.";

    $("#productId").value =
      product.id;

    $("#productName").value =
      product.name || "";

    $("#productPrice").value =
      product.price ?? "";

    $("#productCategory").value =
      product.category || "";

    $("#productFeatured").value =
      String(!!product.featured);

    $("#productDescription").value =
      product.description || "";

    $("#productSizes").value =
      Array.isArray(product.sizes)
        ? product.sizes.join(", ")
        : "";

    state.existingImages =
      Array.isArray(product.images)
        ? [...product.images]
        : [];

    renderPreviews(
      state.existingImages
    );

  } else {

    $("#editorTitle").textContent =
      "Nuevo producto.";
  }

  $("#editorModal").classList.remove("hidden");
}


/* =========================================================
   CERRAR EDITOR
========================================================= */

function closeEditor() {

  $("#editorModal")?.classList.add("hidden");

  state.editingId = null;
  state.existingImages = [];

  const fileInput = $("#productImages");

  if (fileInput) {
    fileInput.value = "";
  }
}


/* =========================================================
   PREVISUALIZAR FOTOS
========================================================= */

function previewNewFiles(e) {

  const files = [
    ...e.target.files
  ];

  const urls = files.map(
    (file) =>
      URL.createObjectURL(file)
  );

  renderPreviews([
    ...state.existingImages,
    ...urls
  ]);

  $("#photoCount").textContent =
    `${state.existingImages.length + files.length} fotos`;
}


/* =========================================================
   PREVIEWS
========================================================= */

function renderPreviews(urls = []) {

  const container =
    $("#previewImages");

  if (!container) {
    return;
  }

  container.innerHTML = urls
    .map(
      (url) => `
        <div>
          <img
            src="${escapeAttr(url)}"
            alt=""
          >
        </div>
      `
    )
    .join("");

  $("#photoCount").textContent =
    `${urls.length} fotos`;
}


/* =========================================================
   GUARDAR PRODUCTO
========================================================= */

async function saveProduct(e) {

  e.preventDefault();

  const button =
    $("#saveProductBtn");

  const errorElement =
    $("#formError");

  if (button) {
    button.disabled = true;
    button.textContent = "Guardando...";
  }

  if (errorElement) {
    errorElement.textContent = "";
  }

  try {

    /* -----------------------------------------------------
       DATOS
    ----------------------------------------------------- */

    const name =
      $("#productName").value.trim();

    const category =
      $("#productCategory").value.trim();

    const description =
      $("#productDescription").value.trim();

    const sizes =
      $("#productSizes")
        .value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    /* -----------------------------------------------------
       PRECIO
    ----------------------------------------------------- */

    let priceValue =
      $("#productPrice").value.trim();

    /*
      Permite:
      178900
      178.900
      178,900
    */

    priceValue =
      priceValue.replace(/\./g, "");

    priceValue =
      priceValue.replace(/,/g, "");

    const price =
      priceValue !== ""
        ? Number(priceValue)
        : null;

    /* -----------------------------------------------------
       VALIDACIONES
    ----------------------------------------------------- */

    if (!name) {
      throw new Error(
        "Completá el nombre del producto."
      );
    }

    if (!category) {
      throw new Error(
        "Completá la categoría."
      );
    }

    if (
      price !== null &&
      (
        Number.isNaN(price) ||
        price < 0
      )
    ) {
      throw new Error(
        "El precio no es válido."
      );
    }

    /* -----------------------------------------------------
       FOTOS
    ----------------------------------------------------- */

    const files =
      $("#productImages")?.files
        ? [...$("#productImages").files]
        : [];

    const uploadedImages = [];

    for (const file of files) {

      const url =
        await uploadImage(file);

      uploadedImages.push(url);
    }

    const images = [
      ...state.existingImages,
      ...uploadedImages
    ];

    /* -----------------------------------------------------
       PAYLOAD
    ----------------------------------------------------- */

    const payload = {

      name,

      price,

      category,

      featured:
        $("#productFeatured").value === "true",

      description,

      sizes,

      images,

      active: true
    };

    /* -----------------------------------------------------
       EDITAR
    ----------------------------------------------------- */

    if (state.editingId) {

      const {
        error
      } = await supabase
        .from("products")
        .update(payload)
        .eq("id", state.editingId);

      if (error) {
        throw error;
      }

      toast(
        "Producto actualizado."
      );

    }

    /* -----------------------------------------------------
       CREAR
    ----------------------------------------------------- */

    else {

      const {
        error
      } = await supabase
        .from("products")
        .insert(payload);

      if (error) {
        throw error;
      }

      toast(
        "Producto publicado."
      );
    }

    closeEditor();

    await loadProducts();

  } catch (error) {

    console.error(error);

    if (errorElement) {
      errorElement.textContent =
        error?.message ||
        "No se pudo guardar el producto.";
    }

  } finally {

    if (button) {
      button.disabled = false;
      button.textContent =
        "Guardar producto";
    }
  }
}


/* =========================================================
   SUBIR IMAGEN
========================================================= */

async function uploadImage(file) {

  if (!file) {
    throw new Error(
      "No se seleccionó ninguna imagen."
    );
  }

  if (!file.type.startsWith("image/")) {
    throw new Error(
      "Solo podés subir imágenes."
    );
  }

  /*
    Nombre seguro
  */

  const safeName =
    file.name
      .toLowerCase()
      .replace(
        /[^a-z0-9._-]/g,
        "-"
      );

  const path =
    `${crypto.randomUUID()}-${safeName}`;

  /*
    Subir a Supabase Storage
  */

  const {
    error
  } = await supabase
    .storage
    .from("product-images")
    .upload(
      path,
      file,
      {
        upsert: false,
        contentType: file.type
      }
    );

  if (error) {
    throw error;
  }

  /*
    Obtener URL pública
  */

  const {
    data
  } = supabase
    .storage
    .from("product-images")
    .getPublicUrl(path);

  if (!data?.publicUrl) {
    throw new Error(
      "No se pudo obtener la URL de la imagen."
    );
  }

  return data.publicUrl;
}


/* =========================================================
   ELIMINAR PRODUCTO
========================================================= */

async function deleteProduct(id) {

  const product =
    state.products.find(
      (item) =>
        String(item.id) === String(id)
    );

  if (!product) {
    return;
  }

  const confirmed =
    confirm(
      `¿Eliminar "${product.name}"?`
    );

  if (!confirmed) {
    return;
  }

  try {

    const {
      error
    } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    toast(
      "Producto eliminado."
    );

    await loadProducts();

  } catch (error) {

    console.error(error);

    toast(
      error?.message ||
      "No se pudo eliminar el producto."
    );
  }
}


/* =========================================================
   PRECIO
========================================================= */

function formatPrice(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "Consultar precio";
  }

  const number =
    Number(value);

  if (Number.isNaN(number)) {
    return "Consultar precio";
  }

  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  ).format(number);
}


/* =========================================================
   SEGURIDAD HTML
========================================================= */

function escapeHtml(value = "") {

  return String(value).replace(
    /[&<>"']/g,
    (character) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[character])
  );
}


function escapeAttr(value = "") {
  return escapeHtml(value);
}


/* =========================================================
   TOAST
========================================================= */

let toastTimer = null;

function toast(message) {

  const element =
    $("#toast");

  if (!element) {
    return;
  }

  element.textContent =
    message;

  element.classList.add("show");

  clearTimeout(toastTimer);

  toastTimer = setTimeout(() => {

    element.classList.remove("show");

  }, 2500);
}
