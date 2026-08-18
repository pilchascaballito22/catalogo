import { supabase, supabaseReady } from "./supabase.js";

const $ = (selector) => document.querySelector(selector);

const state = {
  products: [],
  editingId: null,
  existingImages: [],
  removedImages: []
};

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabase || !supabaseReady) {
    const error = $("#loginError");

    if (error) {
      error.textContent =
        "No se pudo conectar con Supabase. Revisá js/config.js.";
    }

    return;
  }

  setupEvents();

  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    showApp();
  } else {
    showAuth();
  }

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session) {
      showApp();
    } else {
      showAuth();
    }
  });
});


/* =========================================================
   EVENTOS
========================================================= */

function setupEvents() {
  $("#loginForm")?.addEventListener("submit", login);

  $("#logoutBtn")?.addEventListener("click", async () => {
    await supabase.auth.signOut();
  });

  $("#newProductBtn")?.addEventListener("click", () => {
    openEditor();
  });

  $("#productForm")?.addEventListener("submit", saveProduct);

  $("#productImages")?.addEventListener("change", previewNewFiles);

  $("#searchProducts")?.addEventListener("input", renderProducts);

  document.addEventListener("click", async (event) => {

    const closeButton = event.target.closest("[data-close-editor]");
    if (closeButton) {
      closeEditor();
      return;
    }

    const editButton = event.target.closest("[data-edit]");
    if (editButton) {
      openEditor(editButton.dataset.edit);
      return;
    }

    const deleteButton = event.target.closest("[data-delete]");
    if (deleteButton) {
      await deleteProduct(deleteButton.dataset.delete);
      return;
    }

    const toggleButton = event.target.closest("[data-toggle-active]");
    if (toggleButton) {
      await toggleProductActive(toggleButton.dataset.toggleActive);
      return;
    }

    const featuredButton = event.target.closest("[data-toggle-featured]");
    if (featuredButton) {
      await toggleProductFeatured(featuredButton.dataset.toggleFeatured);
      return;
    }

    const removeImageButton = event.target.closest("[data-remove-image]");
    if (removeImageButton) {
      removeExistingImage(Number(removeImageButton.dataset.removeImage));
      return;
    }
  });
}


/* =========================================================
   LOGIN
========================================================= */

async function login(event) {
  event.preventDefault();

  $("#loginError").textContent = "";

  const email = $("#email").value.trim();
  const password = $("#password").value;

  if (!email || !password) {
    $("#loginError").textContent = "Completá email y contraseña.";
    return;
  }

  const button = event.submitter || $("#loginForm button");

  if (button) {
    button.disabled = true;
    button.textContent = "Ingresando...";
  }

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      $("#loginError").textContent = error.message;
    }
  } catch (error) {
    console.error(error);
    $("#loginError").textContent = "No se pudo iniciar sesión.";
  } finally {
    if (button) {
      button.disabled = false;
      button.textContent = "Ingresar →";
    }
  }
}


/* =========================================================
   VISTAS
========================================================= */

async function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");

  await loadProducts();
}

function showAuth() {
  $("#authView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}


/* =========================================================
   PRODUCTOS
========================================================= */

async function loadProducts() {
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    toast(error.message || "No se pudieron cargar los productos.");
    return;
  }

  state.products = data || [];

  updateStats();
  renderProducts();
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

  $("#totalProducts").textContent = total;
  $("#activeProducts").textContent = active;
  $("#featuredProducts").textContent = featured;
}


/* =========================================================
   RENDER ADMIN
========================================================= */

function renderProducts() {
  const searchInput = $("#searchProducts");

  const query = (searchInput?.value || "")
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

  if (!container) return;

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
   TARJETA DE PRODUCTO
========================================================= */

function adminCard(product) {
  const image = product.images?.[0] || "";

  const activeText = product.active
    ? "Publicado"
    : "Oculto";

  const featuredText = product.featured
    ? "★ Destacado"
    : "☆ Normal";

  const toggleText = product.active
    ? "Ocultar"
    : "Publicar";

  return `
    <article class="admin-product">

      <div class="admin-product-image">
        ${
          image
            ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(product.name || "")}" loading="lazy">`
            : `<span>Sin foto</span>`
        }

        ${
          product.featured
            ? `<span class="product-badge">★</span>`
            : ""
        }
      </div>

      <div class="admin-product-data">

        <small>
          ${escapeHtml(product.category || "Indumentaria")}
          ·
          ${escapeHtml(activeText)}
        </small>

        <h3>
          ${escapeHtml(product.name || "Sin nombre")}
        </h3>

        <p>
          ${formatPrice(product.price)}
        </p>

        <div class="admin-product-meta">
          <span class="${product.active ? "status-active" : "status-hidden"}">
            ${escapeHtml(activeText)}
          </span>

          <span class="${product.featured ? "status-featured" : ""}">
            ${escapeHtml(featuredText)}
          </span>
        </div>

        <div class="admin-product-actions">

          <button
            class="small-btn"
            data-edit="${escapeAttr(product.id)}">
            Editar
          </button>

          <button
            class="small-btn"
            data-toggle-active="${escapeAttr(product.id)}">
            ${toggleText}
          </button>

          <button
            class="small-btn"
            data-toggle-featured="${escapeAttr(product.id)}">
            ${product.featured ? "Quitar ★" : "Destacar"}
          </button>

          <button
            class="small-btn delete"
            data-delete="${escapeAttr(product.id)}">
            Eliminar
          </button>

        </div>

      </div>

    </article>
  `;
}


/* =========================================================
   EDITOR
========================================================= */

function openEditor(id = null) {
  state.editingId = id;
  state.existingImages = [];
  state.removedImages = [];

  $("#productForm").reset();

  $("#productId").value = "";
  $("#previewImages").innerHTML = "";
  $("#photoCount").textContent = "0 fotos";
  $("#formError").textContent = "";

  if (id) {
    const product = state.products.find(
      (item) => String(item.id) === String(id)
    );

    if (!product) {
      toast("Producto no encontrado.");
      return;
    }

    $("#editorTitle").textContent = "Editar producto.";

    $("#productId").value = product.id;

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

    renderPreviews();

  } else {
    $("#editorTitle").textContent =
      "Nuevo producto.";

    $("#productFeatured").value = "false";
  }

  $("#editorModal").classList.remove("hidden");
}


/* =========================================================
   CERRAR EDITOR
========================================================= */

function closeEditor() {
  $("#editorModal").classList.add("hidden");

  state.editingId = null;
  state.existingImages = [];
  state.removedImages = [];
}


/* =========================================================
   PREVIEW FOTOS NUEVAS
========================================================= */

function previewNewFiles(event) {
  const files = [...event.target.files];

  renderPreviews(files);
}


/* =========================================================
   PREVIEW GENERAL
========================================================= */

function renderPreviews(newFiles = []) {
  const container = $("#previewImages");

  if (!container) return;

  let html = "";

  state.existingImages.forEach((url, index) => {
    html += `
      <div class="preview-image-item">

        <img
          src="${escapeAttr(url)}"
          alt="Foto ${index + 1}"
        >

        <button
          type="button"
          class="preview-remove"
          data-remove-image="${index}"
          title="Eliminar foto">
          ×
        </button>

      </div>
    `;
  });

  newFiles.forEach((file) => {
    const url = URL.createObjectURL(file);

    html += `
      <div class="preview-image-item">

        <img
          src="${escapeAttr(url)}"
          alt="${escapeAttr(file.name)}"
        >

        <span class="preview-new">
          NUEVA
        </span>

      </div>
    `;
  });

  container.innerHTML = html;

  const total =
    state.existingImages.length +
    newFiles.length;

  $("#photoCount").textContent =
    `${total} ${total === 1 ? "foto" : "fotos"}`;
}


/* =========================================================
   QUITAR FOTO EXISTENTE
========================================================= */

function removeExistingImage(index) {
  if (
    index < 0 ||
    index >= state.existingImages.length
  ) {
    return;
  }

  const removed =
    state.existingImages[index];

  if (removed) {
    state.removedImages.push(removed);
  }

  state.existingImages.splice(index, 1);

  const files = [
    ...$("#productImages").files
  ];

  renderPreviews(files);

  toast("Foto marcada para eliminar.");
}


/* =========================================================
   GUARDAR PRODUCTO
========================================================= */

async function saveProduct(event) {
  event.preventDefault();

  const button = $("#saveProductBtn");

  button.disabled = true;
  button.textContent = "Guardando...";

  $("#formError").textContent = "";

  try {
    const files = [
      ...$("#productImages").files
    ];

    const name =
      $("#productName").value.trim();

    const category =
      $("#productCategory").value.trim();

    const priceValue =
      $("#productPrice").value.trim();

    const description =
      $("#productDescription").value.trim();

    const sizes =
      $("#productSizes").value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);

    const featured =
      $("#productFeatured").value === "true";

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

    let price = null;

    if (priceValue !== "") {
      price = Number(priceValue);

      if (!Number.isFinite(price)) {
        throw new Error(
          "El precio no es válido."
        );
      }

      if (price < 0) {
        throw new Error(
          "El precio no puede ser negativo."
        );
      }
    }

    /* -----------------------------------------------------
       SUBIR NUEVAS FOTOS
    ----------------------------------------------------- */

    const uploadedImages = [];

    for (const file of files) {
      if (!file.type.startsWith("image/")) {
        throw new Error(
          `"${file.name}" no es una imagen válida.`
        );
      }

      uploadedImages.push(
        await uploadImage(file)
      );
    }

    const images = [
      ...state.existingImages,
      ...uploadedImages
    ];

    /* -----------------------------------------------------
       NUEVO PRODUCTO
    ----------------------------------------------------- */

    if (!state.editingId) {

      const payload = {
        name,
        price,
        category,
        featured,
        description,
        sizes,
        images,
        active: true
      };

      const {
        error
      } = await supabase
        .from("products")
        .insert(payload);

      if (error) {
        throw error;
      }

      toast("Producto publicado.");

    }

    /* -----------------------------------------------------
       EDITAR PRODUCTO
    ----------------------------------------------------- */

    else {

      const currentProduct =
        state.products.find(
          (product) =>
            String(product.id) ===
            String(state.editingId)
        );

      if (!currentProduct) {
        throw new Error(
          "No se encontró el producto."
        );
      }

      /*
       * IMPORTANTE:
       * Conservamos active.
       *
       * Así, editar un producto oculto
       * NO lo vuelve a publicar automáticamente.
       */

      const payload = {
        name,
        price,
        category,
        featured,
        description,
        sizes,
        images,
        active: !!currentProduct.active
      };

      const {
        error
      } = await supabase
        .from("products")
        .update(payload)
        .eq("id", state.editingId);

      if (error) {
        throw error;
      }

      /* ---------------------------------------------------
         ELIMINAR FOTOS MARCADAS DEL STORAGE
      --------------------------------------------------- */

      if (state.removedImages.length) {
        await deleteStorageImages(
          state.removedImages
        );
      }

      toast("Producto actualizado.");
    }

    closeEditor();

    await loadProducts();

  } catch (error) {

    console.error(
      "Error guardando producto:",
      error
    );

    $("#formError").textContent =
      error?.message ||
      "No se pudo guardar el producto.";

  } finally {

    button.disabled = false;
    button.textContent =
      "Guardar producto";
  }
}


/* =========================================================
   SUBIR IMAGEN
========================================================= */

async function uploadImage(file) {
  const originalName =
    file.name || "imagen";

  const safeName =
    originalName
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9._-]/g, "-");

  const path =
    `${crypto.randomUUID()}-${safeName}`;

  const {
    error
  } = await supabase.storage
    .from("product-images")
    .upload(
      path,
      file,
      {
        upsert: false,
        contentType: file.type,
        cacheControl: "3600"
      }
    );

  if (error) {
    throw error;
  }

  const {
    data
  } = supabase.storage
    .from("product-images")
    .getPublicUrl(path);

  return data.publicUrl;
}


/* =========================================================
   ELIMINAR FOTOS DEL STORAGE
========================================================= */

async function deleteStorageImages(urls) {
  const paths = urls
    .map(publicUrlToStoragePath)
    .filter(Boolean);

  if (!paths.length) {
    return;
  }

  const {
    error
  } = await supabase.storage
    .from("product-images")
    .remove(paths);

  if (error) {
    console.warn(
      "No se pudieron eliminar algunas imágenes:",
      error
    );

    /*
     * No interrumpimos la actualización del producto
     * si falla solamente la limpieza del Storage.
     */
  }
}


/* =========================================================
   CONVERTIR URL PÚBLICA → PATH STORAGE
========================================================= */

function publicUrlToStoragePath(url) {
  if (!url) return null;

  try {
    const marker =
      "/storage/v1/object/public/product-images/";

    const index =
      url.indexOf(marker);

    if (index === -1) {
      return null;
    }

    return decodeURIComponent(
      url.substring(
        index + marker.length
      )
    );

  } catch (error) {
    console.warn(
      "No se pudo interpretar la URL:",
      url
    );

    return null;
  }
}


/* =========================================================
   PUBLICAR / OCULTAR
========================================================= */

async function toggleProductActive(id) {
  const product =
    state.products.find(
      (item) =>
        String(item.id) === String(id)
    );

  if (!product) {
    return;
  }

  const newValue =
    !product.active;

  const actionText =
    newValue
      ? "publicar"
      : "ocultar";

  const confirmed =
    confirm(
      `¿Querés ${actionText} "${product.name}"?`
    );

  if (!confirmed) {
    return;
  }

  const {
    error
  } = await supabase
    .from("products")
    .update({
      active: newValue
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message);
    return;
  }

  toast(
    newValue
      ? "Producto publicado."
      : "Producto ocultado."
  );

  await loadProducts();
}


/* =========================================================
   DESTACADO
========================================================= */

async function toggleProductFeatured(id) {
  const product =
    state.products.find(
      (item) =>
        String(item.id) === String(id)
    );

  if (!product) {
    return;
  }

  const newValue =
    !product.featured;

  const {
    error
  } = await supabase
    .from("products")
    .update({
      featured: newValue
    })
    .eq("id", id);

  if (error) {
    console.error(error);
    toast(error.message);
    return;
  }

  toast(
    newValue
      ? "Producto destacado."
      : "Producto quitado de destacados."
  );

  await loadProducts();
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
      `¿Eliminar "${product.name}"?\n\n` +
      `Esta acción eliminará el producto del catálogo.`
    );

  if (!confirmed) {
    return;
  }

  try {

    /* -----------------------------------------------------
       ELIMINAR PRODUCTO DE LA BASE
    ----------------------------------------------------- */

    const {
      error
    } = await supabase
      .from("products")
      .delete()
      .eq("id", id);

    if (error) {
      throw error;
    }

    /* -----------------------------------------------------
       ELIMINAR FOTOS DEL STORAGE
    ----------------------------------------------------- */

    if (
      Array.isArray(product.images) &&
      product.images.length
    ) {
      await deleteStorageImages(
        product.images
      );
    }

    toast("Producto eliminado.");

    await loadProducts();

  } catch (error) {

    console.error(
      "Error eliminando producto:",
      error
    );

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

  if (!Number.isFinite(number)) {
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
   ESCAPAR HTML
========================================================= */

function escapeHtml(value = "") {
  return String(value).replace(
    /[&<>"']/g,
    (match) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[match])
  );
}


function escapeAttr(value = "") {
  return escapeHtml(value);
}


/* =========================================================
   TOAST
========================================================= */

function toast(message) {
  const element = $("#toast");

  if (!element) {
    return;
  }

  element.textContent =
    message || "";

  element.classList.add("show");

  clearTimeout(
    toast.timer
  );

  toast.timer =
    setTimeout(() => {
      element.classList.remove("show");
    }, 2500);
}
