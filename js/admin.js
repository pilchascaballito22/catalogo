/* ========================================================= */
/* PC22 - PANEL DE ADMINISTRACIÓN */
/* ========================================================= */

import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

/* ========================================================= */
/* SUPABASE */
/* ========================================================= */

const SUPABASE_URL =
  "https://mrlfnmipizbvmfzsukfa.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_kgLgKJvbHP_VfK8JqhPZwA_JtWMBfzq";

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY
);

const STORAGE_BUCKET = "product-images";

/* ========================================================= */
/* VARIABLES */
/* ========================================================= */

let products = [];
let currentUser = null;
let editingProductId = null;

/* ========================================================= */
/* ELEMENTOS */
/* ========================================================= */

const authView = document.getElementById("authView");
const appView = document.getElementById("appView");

const loginForm = document.getElementById("loginForm");
const loginError = document.getElementById("loginError");

const logoutBtn = document.getElementById("logoutBtn");
const newProductBtn = document.getElementById("newProductBtn");

const editorModal = document.getElementById("editorModal");
const productForm = document.getElementById("productForm");

const productId = document.getElementById("productId");
const productName = document.getElementById("productName");
const productPrice = document.getElementById("productPrice");
const productCategory = document.getElementById("productCategory");
const productFeatured = document.getElementById("productFeatured");
const productDescription = document.getElementById("productDescription");
const productSizes = document.getElementById("productSizes");

const productImages = document.getElementById("productImages");
const previewImages = document.getElementById("previewImages");
const photoCount = document.getElementById("photoCount");

const editorTitle = document.getElementById("editorTitle");
const saveProductBtn = document.getElementById("saveProductBtn");
const formError = document.getElementById("formError");

const adminProducts = document.getElementById("adminProducts");
const searchProducts = document.getElementById("searchProducts");

const totalProducts = document.getElementById("totalProducts");
const activeProducts = document.getElementById("activeProducts");
const featuredProducts = document.getElementById("featuredProducts");

const toast = document.getElementById("toast");

/* ========================================================= */
/* UTILIDADES */
/* ========================================================= */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/* ========================================================= */
/* PRECIO ARGENTINO */
/* ========================================================= */

/*
  El input visual muestra:

  $35.000
  $178.900
  $1.250.000

  Pero cuando guardamos obtenemos:

  35000
  178900
  1250000
*/

function formatPrice(value) {
  const raw = String(value ?? "").replace(/\D/g, "");

  if (!raw) {
    return "";
  }

  return "$" + Number(raw).toLocaleString("es-AR");
}

function getRawPrice(value) {
  const raw = String(value ?? "").replace(/\D/g, "");

  if (!raw) {
    return 0;
  }

  return Number(raw);
}

if (productPrice) {

  productPrice.type = "text";
  productPrice.inputMode = "numeric";
  productPrice.autocomplete = "off";
  productPrice.placeholder = "$35.000";

  productPrice.addEventListener("input", () => {

    const raw = productPrice.value.replace(/\D/g, "");

    if (!raw) {
      productPrice.value = "";
      return;
    }

    productPrice.value =
      "$" + Number(raw).toLocaleString("es-AR");

    productPrice.setSelectionRange(
      productPrice.value.length,
      productPrice.value.length
    );
  });
}

/* ========================================================= */
/* TOAST */
/* ========================================================= */

function showToast(message) {

  if (!toast) {
    return;
  }

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 3000);
}

/* ========================================================= */
/* MAPEAR PRODUCTO DESDE SUPABASE */
/* ========================================================= */

function mapDatabaseProduct(row) {

  const imageUrl =
    row.image_url || "";

  const images =
    Array.isArray(row.images) && row.images.length
      ? row.images
      : imageUrl
        ? [imageUrl]
        : [];

  return {
    id: Number(row.id),

    name:
      row.name || "Producto",

    price:
      Number(row.price) || 0,

    description:
      row.description || "",

    category:
      row.category || "Ropa",

    badge:
      typeof row.badge === "string"
        ? row.badge
        : "",

    sizes:
      Array.isArray(row.sizes)
        ? row.sizes
        : [],

    img:
      imageUrl,

    imgs:
      images
  };
}

/* ========================================================= */
/* CARGAR PRODUCTOS */
/* ========================================================= */

async function loadProducts() {

  try {

    const {
      data,
      error
    } = await supabase
      .from("products")
      .select("*")
      .order("id", {
        ascending: true
      });

    if (error) {
      throw error;
    }

    products =
      (data || []).map(mapDatabaseProduct);

    renderAdminProducts();
    updateStats();

  } catch (error) {

    console.error(
      "Error cargando productos:",
      error
    );

    products = [];

    renderAdminProducts();
    updateStats();

    showToast(
      "No se pudieron cargar los productos."
    );
  }
}

/* ========================================================= */
/* ESTADÍSTICAS */
/* ========================================================= */

function updateStats() {

  if (totalProducts) {
    totalProducts.textContent =
      products.length;
  }

  if (activeProducts) {
    activeProducts.textContent =
      products.length;
  }

  if (featuredProducts) {

    featuredProducts.textContent =
      products.filter(
        product =>
          product.badge === "DESTACADO"
      ).length;
  }
}

/* ========================================================= */
/* RENDER ADMIN */
/* ========================================================= */

function renderAdminProducts() {

  if (!adminProducts) {
    return;
  }

  const search =
    searchProducts
      ? searchProducts.value
          .trim()
          .toLowerCase()
      : "";

  const filtered =
    products.filter(product => {

      if (!search) {
        return true;
      }

      return (
        product.name
          .toLowerCase()
          .includes(search) ||

        product.category
          .toLowerCase()
          .includes(search)
      );
    });

  if (!filtered.length) {

    adminProducts.innerHTML = `
      <div class="empty-state">
        No hay productos.
      </div>
    `;

    return;
  }

  adminProducts.innerHTML =
    filtered
      .map(product => {

        const image =
          product.img || "";

        const badge =
          product.badge ||
          "NORMAL";

        return `
          <div class="admin-product-item">

            <div class="admin-product-main">

              ${
                image
                  ? `
                    <img
                      class="admin-product-image"
                      src="${escapeHtml(image)}"
                      alt="${escapeHtml(product.name)}"
                    >
                  `
                  : ""
              }

              <div class="admin-product-info">

                <div class="admin-product-name">
                  ${escapeHtml(product.name)}
                </div>

                <div class="admin-product-meta">
                  ${escapeHtml(product.category)}
                  ·
                  $${Number(product.price).toLocaleString("es-AR")}
                </div>

                ${
                  badge === "DESTACADO"
                    ? `
                      <span class="admin-badge">
                        DESTACADO
                      </span>
                    `
                    : ""
                }

              </div>

            </div>

            <div class="admin-actions">

              <button
                type="button"
                class="btn-icon"
                data-edit-product="${product.id}"
                title="Editar producto"
              >
                ✏️
              </button>

              <button
                type="button"
                class="btn-icon delete"
                data-delete-product="${product.id}"
                title="Eliminar producto"
              >
                🗑
              </button>

            </div>

          </div>
        `;
      })
      .join("");
}

/* ========================================================= */
/* EVENTOS DE LA LISTA */
/* ========================================================= */

if (adminProducts) {

  adminProducts.addEventListener(
    "click",
    event => {

      const editButton =
        event.target.closest(
          "[data-edit-product]"
        );

      if (editButton) {

        const id =
          Number(
            editButton.dataset.editProduct
          );

        openEditProduct(id);

        return;
      }

      const deleteButton =
        event.target.closest(
          "[data-delete-product]"
        );

      if (deleteButton) {

        const id =
          Number(
            deleteButton.dataset.deleteProduct
          );

        deleteProduct(id);
      }
    }
  );
}

/* ========================================================= */
/* BUSCADOR */
/* ========================================================= */

if (searchProducts) {

  searchProducts.addEventListener(
    "input",
    () => {
      renderAdminProducts();
    }
  );
}

/* ========================================================= */
/* ABRIR MODAL NUEVO */
/* ========================================================= */

if (newProductBtn) {

  newProductBtn.addEventListener(
    "click",
    () => {
      openNewProduct();
    }
  );
}

/* ========================================================= */
/* NUEVO PRODUCTO */
/* ========================================================= */

function openNewProduct() {

  editingProductId = null;

  if (productId) {
    productId.value = "";
  }

  if (editorTitle) {
    editorTitle.textContent =
      "Nuevo producto.";
  }

  if (productName) {
    productName.value = "";
  }

  if (productPrice) {
    productPrice.value = "";
  }

  if (productCategory) {
    productCategory.value = "";
  }

  if (productFeatured) {
    productFeatured.value = "false";
  }

  if (productDescription) {
    productDescription.value = "";
  }

  if (productSizes) {
    productSizes.value = "";
  }

  if (productImages) {
    productImages.value = "";
  }

  if (previewImages) {
    previewImages.innerHTML = "";
  }

  if (photoCount) {
    photoCount.textContent =
      "0 fotos";
  }

  clearFormError();

  openEditor();
}

/* ========================================================= */
/* EDITAR PRODUCTO */
/* ========================================================= */

function openEditProduct(id) {

  const product =
    products.find(
      item => item.id === id
    );

  if (!product) {
    showToast(
      "No se encontró el producto."
    );
    return;
  }

  editingProductId =
    product.id;

  if (productId) {
    productId.value =
      String(product.id);
  }

  if (editorTitle) {
    editorTitle.textContent =
      "Editar producto.";
  }

  if (productName) {
    productName.value =
      product.name || "";
  }

  if (productPrice) {

    productPrice.value =
      product.price
        ? "$" +
          Number(product.price)
            .toLocaleString("es-AR")
        : "";
  }

  if (productCategory) {
    productCategory.value =
      product.category || "";
  }

  if (productFeatured) {

    productFeatured.value =
      product.badge === "DESTACADO"
        ? "true"
        : "false";
  }

  if (productDescription) {
    productDescription.value =
      product.description || "";
  }

  if (productSizes) {

    if (Array.isArray(product.sizes)) {

      productSizes.value =
        product.sizes.join(", ");

    } else {

      productSizes.value =
        "";
    }
  }

  if (productImages) {
    productImages.value = "";
  }

  clearFormError();

  renderExistingImages(product);

  openEditor();
}

/* ========================================================= */
/* MOSTRAR IMÁGENES EXISTENTES */
/* ========================================================= */

function renderExistingImages(product) {

  if (!previewImages) {
    return;
  }

  const images =
    Array.isArray(product.imgs)
      ? product.imgs
      : [];

  previewImages.innerHTML =
    images
      .map(
        image => `
          <div class="preview-image">
            <img
              src="${escapeHtml(image)}"
              alt="${escapeHtml(product.name)}"
            >
          </div>
        `
      )
      .join("");

  if (photoCount) {

    photoCount.textContent =
      `${images.length} ${
        images.length === 1
          ? "foto"
          : "fotos"
      }`;
  }
}

/* ========================================================= */
/* ABRIR / CERRAR EDITOR */
/* ========================================================= */

function openEditor() {

  if (!editorModal) {
    return;
  }

  editorModal.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";
}

function closeEditor() {

  if (!editorModal) {
    return;
  }

  editorModal.classList.add(
    "hidden"
  );

  document.body.style.overflow =
    "";

  editingProductId = null;
}

/* ========================================================= */
/* CERRAR MODAL */
/* ========================================================= */

document
  .querySelectorAll(
    "[data-close-editor]"
  )
  .forEach(element => {

    element.addEventListener(
      "click",
      () => {
        closeEditor();
      }
    );
  });

/* ========================================================= */
/* PREVISUALIZACIÓN DE FOTOS NUEVAS */
/* ========================================================= */

if (productImages) {

  productImages.addEventListener(
    "change",
    () => {

      const files =
        Array.from(
          productImages.files || []
        );

      if (!files.length) {
        return;
      }

      if (previewImages) {

        previewImages.innerHTML = "";

        files.forEach(file => {

          const reader =
            new FileReader();

          reader.onload =
            event => {

              const div =
                document.createElement(
                  "div"
                );

              div.className =
                "preview-image";

              div.innerHTML = `
                <img
                  src="${event.target.result}"
                  alt="Vista previa"
                >
              `;

              previewImages.appendChild(
                div
              );
            };

          reader.readAsDataURL(file);
        });
      }

      if (photoCount) {

        photoCount.textContent =
          `${files.length} ${
            files.length === 1
              ? "foto"
              : "fotos"
          }`;
      }
    }
  );
}

/* ========================================================= */
/* COMPRESIÓN DE IMAGEN */
/* ========================================================= */

async function compressImage(
  file,
  maxWidth = 1800,
  maxHeight = 1800,
  quality = 0.86
) {

  return new Promise(
    (resolve, reject) => {

      const reader =
        new FileReader();

      reader.onload =
        event => {

          const image =
            new Image();

          image.onload =
            () => {

              let width =
                image.width;

              let height =
                image.height;

              const ratio =
                Math.min(
                  maxWidth / width,
                  maxHeight / height,
                  1
                );

              width =
                Math.round(
                  width * ratio
                );

              height =
                Math.round(
                  height * ratio
                );

              const canvas =
                document.createElement(
                  "canvas"
                );

              canvas.width =
                width;

              canvas.height =
                height;

              const context =
                canvas.getContext(
                  "2d"
                );

              context.fillStyle =
                "#ffffff";

              context.fillRect(
                0,
                0,
                width,
                height
              );

              context.drawImage(
                image,
                0,
                0,
                width,
                height
              );

              canvas.toBlob(
                blob => {

                  if (!blob) {

                    reject(
                      new Error(
                        "No se pudo comprimir la imagen."
                      )
                    );

                    return;
                  }

                  const originalName =
                    file.name
                      .replace(
                        /\.[^/.]+$/,
                        ""
                      )
                      .replace(
                        /[^a-zA-Z0-9_-]/g,
                        "-"
                      );

                  const compressedFile =
                    new File(
                      [blob],
                      `${originalName}.jpg`,
                      {
                        type:
                          "image/jpeg",

                        lastModified:
                          Date.now()
                      }
                    );

                  resolve(
                    compressedFile
                  );

                },
                "image/jpeg",
                quality
              );
            };

          image.onerror =
            () => {

              reject(
                new Error(
                  "No se pudo leer la imagen."
                )
              );
            };

          image.src =
            event.target.result;
        };

      reader.onerror =
        () => {

          reject(
            new Error(
              "No se pudo leer el archivo."
            )
          );
        };

      reader.readAsDataURL(file);
    }
  );
}

/* ========================================================= */
/* SUBIR IMAGEN */
/* ========================================================= */

async function uploadProductImage(file) {

  if (!file) {
    throw new Error(
      "No seleccionaste ninguna imagen."
    );
  }

  if (
    !file.type.startsWith(
      "image/"
    )
  ) {
    throw new Error(
      "El archivo seleccionado no es una imagen."
    );
  }

  const maxOriginalSize =
    30 * 1024 * 1024;

  if (
    file.size >
    maxOriginalSize
  ) {
    throw new Error(
      "La imagen original no puede superar los 30 MB."
    );
  }

  const compressedFile =
    await compressImage(
      file,
      1800,
      1800,
      0.86
    );

  const fileName =
    `${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 10)}.jpg`;

  const {
    error
  } = await supabase
    .storage
    .from(STORAGE_BUCKET)
    .upload(
      fileName,
      compressedFile,
      {
        cacheControl:
          "31536000",

        upsert:
          false,

        contentType:
          "image/jpeg"
      }
    );

  if (error) {
    throw error;
  }

  const {
    data
  } = supabase
    .storage
    .from(STORAGE_BUCKET)
    .getPublicUrl(
      fileName
    );

  if (
    !data ||
    !data.publicUrl
  ) {
    throw new Error(
      "No se pudo obtener la URL pública."
    );
  }

  return data.publicUrl;
}

/* ========================================================= */
/* GUARDAR PRODUCTO */
/* ========================================================= */

if (productForm) {

  productForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      await saveProduct();
    }
  );
}

async function saveProduct() {

  if (!currentUser) {

    showFormError(
      "Primero iniciá sesión como administrador."
    );

    return;
  }

  clearFormError();

  const name =
    productName
      ? productName.value.trim()
      : "";

  const price =
    getRawPrice(
      productPrice
        ? productPrice.value
        : ""
    );

  const category =
    productCategory
      ? productCategory.value.trim()
      : "";

  const description =
    productDescription
      ? productDescription.value.trim()
      : "";

  const featured =
    productFeatured
      ? productFeatured.value === "true"
      : false;

  const sizes =
    productSizes
      ? productSizes.value
          .split(",")
          .map(size => size.trim())
          .filter(Boolean)
      : [];

  const files =
    productImages
      ? Array.from(
          productImages.files || []
        )
      : [];

  if (!name) {

    showFormError(
      "Escribí el nombre del producto."
    );

    return;
  }

  if (
    !Number.isFinite(price) ||
    price < 0
  ) {

    showFormError(
      "Introducí un precio válido."
    );

    return;
  }

  if (!category) {

    showFormError(
      "Escribí una categoría."
    );

    return;
  }

  saveProductBtn.disabled =
    true;

  try {

    /* ===================================================== */
    /* EDITAR PRODUCTO EXISTENTE */
    /* ===================================================== */

    if (editingProductId) {

      const existingProduct =
        products.find(
          product =>
            product.id ===
            Number(editingProductId)
        );

      if (!existingProduct) {

        throw new Error(
          "No se encontró el producto."
        );
      }

      let imageUrls =
        Array.isArray(
          existingProduct.imgs
        )
          ? [...existingProduct.imgs]
          : existingProduct.img
            ? [existingProduct.img]
            : [];

      /* --------------------------------------------- */
      /* SI ELEGIMOS FOTOS NUEVAS */
      /* --------------------------------------------- */

      if (files.length) {

        saveProductBtn.textContent =
          "SUBIENDO IMÁGENES...";

        const uploadedImages = [];

        for (
          const file of files
        ) {

          const url =
            await uploadProductImage(
              file
            );

          uploadedImages.push(
            url
          );
        }

        /*
          Si elegís fotos nuevas,
          reemplazamos las anteriores.
        */

        imageUrls =
          uploadedImages;
      }

      const mainImage =
        imageUrls[0] || "";

      saveProductBtn.textContent =
        "GUARDANDO CAMBIOS...";

      /*
        IMPORTANTE:

        Guardamos el precio como número,
        no como "$178.900".
      */

      const updateData = {
        name: name,

        price: price,

        category: category,

        description: description,

        badge:
          featured
            ? "DESTACADO"
            : "",

        image_url:
          mainImage,

        images:
          imageUrls,

        sizes:
          sizes
      };

      const {
        data,
        error
      } = await supabase
        .from("products")
        .update(updateData)
        .eq(
          "id",
          Number(editingProductId)
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      const updatedProduct =
        mapDatabaseProduct(
          data
        );

      const index =
        products.findIndex(
          product =>
            product.id ===
            Number(editingProductId)
        );

      if (index !== -1) {

        products[index] =
          updatedProduct;
      }

      renderAdminProducts();
      updateStats();

      closeEditor();

      showToast(
        "Producto actualizado correctamente."
      );

      return;
    }

    /* ===================================================== */
    /* CREAR PRODUCTO NUEVO */
    /* ===================================================== */

    if (!files.length) {

      showFormError(
        "Seleccioná al menos una foto del producto."
      );

      return;
    }

    saveProductBtn.textContent =
      "SUBIENDO IMÁGENES...";

    const uploadedImages = [];

    for (
      const file of files
    ) {

      const url =
        await uploadProductImage(
          file
        );

      uploadedImages.push(
        url
      );
    }

    const mainImage =
      uploadedImages[0] || "";

    saveProductBtn.textContent =
      "GUARDANDO PRODUCTO...";

    const insertData = {

      name: name,

      price: price,

      category: category,

      description:
        description,

      badge:
        featured
          ? "DESTACADO"
          : "",

      image_url:
        mainImage,

      images:
        uploadedImages,

      sizes:
        sizes
    };

    const {
      data,
      error
    } = await supabase
      .from("products")
      .insert(
        insertData
      )
      .select()
      .single();

    if (error) {
      throw error;
    }

    products.push(
      mapDatabaseProduct(
        data
      )
    );

    products.sort(
      (a, b) =>
        a.id - b.id
    );

    renderAdminProducts();
    updateStats();

    closeEditor();

    showToast(
      "Producto agregado correctamente."
    );

  } catch (error) {

    console.error(
      "Error guardando producto:",
      error
    );

    showFormError(
      "No se pudo guardar el producto.\n\n" +
      error.message
    );

  } finally {

    saveProductBtn.disabled =
      false;

    saveProductBtn.textContent =
      editingProductId
        ? "Guardar producto"
        : "Guardar producto";
  }
}

/* ========================================================= */
/* ELIMINAR PRODUCTO */
/* ========================================================= */

async function deleteProduct(id) {

  if (!currentUser) {
    return;
  }

  const product =
    products.find(
      item => item.id === id
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
      .eq(
        "id",
        id
      );

    if (error) {
      throw error;
    }

    products =
      products.filter(
        item =>
          item.id !== id
      );

    renderAdminProducts();
    updateStats();

    showToast(
      "Producto eliminado correctamente."
    );

  } catch (error) {

    console.error(
      "Error eliminando producto:",
      error
    );

    showToast(
      "No se pudo eliminar el producto."
    );
  }
}

/* ========================================================= */
/* LOGIN */
/* ========================================================= */

if (loginForm) {

  loginForm.addEventListener(
    "submit",
    async event => {

      event.preventDefault();

      await login();
    }
  );
}

async function login() {

  clearLoginError();

  const email =
    document
      .getElementById("email")
      ?.value
      .trim();

  const password =
    document
      .getElementById("password")
      ?.value;

  if (!email || !password) {

    showLoginError(
      "Completá email y contraseña."
    );

    return;
  }

  const button =
    loginForm.querySelector(
      "button[type='submit']"
    );

  if (button) {
    button.disabled =
      true;

    button.textContent =
      "Ingresando...";
  }

  try {

    const {
      data,
      error
    } = await supabase.auth
      .signInWithPassword({
        email,
        password
      });

    if (error) {
      throw error;
    }

    currentUser =
      data.user || null;

    showApp();

    await loadProducts();

  } catch (error) {

    console.error(
      "Error de login:",
      error
    );

    showLoginError(
      "Email o contraseña incorrectos."
    );

  } finally {

    if (button) {

      button.disabled =
        false;

      button.textContent =
        "Ingresar →";
    }
  }
}

/* ========================================================= */
/* SESIÓN ACTUAL */
/* ========================================================= */

async function checkSession() {

  try {

    const {
      data
    } = await supabase.auth
      .getSession();

    currentUser =
      data?.session?.user ||
      null;

    if (currentUser) {

      showApp();

      await loadProducts();

    } else {

      showLogin();
    }

  } catch (error) {

    console.error(
      "Error obteniendo sesión:",
      error
    );

    showLogin();
  }
}

/* ========================================================= */
/* CAMBIOS DE SESIÓN */
/* ========================================================= */

supabase.auth.onAuthStateChange(
  (_event, session) => {

    currentUser =
      session?.user ||
      null;

    if (currentUser) {

      showApp();

    } else {

      showLogin();
    }
  }
);

/* ========================================================= */
/* MOSTRAR APP */
/* ========================================================= */

function showApp() {

  if (authView) {
    authView.classList.add(
      "hidden"
    );
  }

  if (appView) {
    appView.classList.remove(
      "hidden"
    );
  }
}

/* ========================================================= */
/* MOSTRAR LOGIN */
/* ========================================================= */

function showLogin() {

  if (authView) {
    authView.classList.remove(
      "hidden"
    );
  }

  if (appView) {
    appView.classList.add(
      "hidden"
    );
  }
}

/* ========================================================= */
/* CERRAR SESIÓN */
/* ========================================================= */

if (logoutBtn) {

  logoutBtn.addEventListener(
    "click",
    async () => {

      await supabase.auth
        .signOut();

      currentUser =
        null;

      products =
        [];

      showLogin();

      showToast(
        "Sesión cerrada."
      );
    }
  );
}

/* ========================================================= */
/* ERRORES */
/* ========================================================= */

function showLoginError(message) {

  if (!loginError) {
    return;
  }

  loginError.textContent =
    message;

  loginError.classList.add(
    "show"
  );
}

function clearLoginError() {

  if (!loginError) {
    return;
  }

  loginError.textContent =
    "";

  loginError.classList.remove(
    "show"
  );
}

function showFormError(message) {

  if (!formError) {
    return;
  }

  formError.textContent =
    message;

  formError.classList.add(
    "show"
  );
}

function clearFormError() {

  if (!formError) {
    return;
  }

  formError.textContent =
    "";

  formError.classList.remove(
    "show"
  );
}

/* ========================================================= */
/* INICIAR */
/* ========================================================= */

checkSession();
