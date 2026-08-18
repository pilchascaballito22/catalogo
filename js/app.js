import { supabase } from "./supabase.js";
import { STORE } from "./config.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = {
  products: [],
  category: "Todos",
  cart: JSON.parse(localStorage.getItem("pc22_cart") || "[]")
};

// =========================================================
// INICIO
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {
  setupLinks();
  setupMenu();
  setupModal();
  setupCart();

  updateCartUI();

  if (!supabase) {
    showDemo();
    return;
  }

  await loadProducts();
});


// =========================================================
// DATOS DE CONTACTO
// =========================================================

const INSTAGRAM_URL =
  "https://www.instagram.com/pilchas_caballito22/";

const WHATSAPP_NUMBER =
  "5491130786998";


// =========================================================
// LINKS DE CONTACTO
// =========================================================

function setupLinks() {

  const whatsappURL =
    `https://wa.me/${WHATSAPP_NUMBER}`;

  // WhatsApp
  [
    "headerWhatsapp",
    "mobileWhatsapp",
    "contactWhatsapp"
  ].forEach((id) => {

    const el = document.getElementById(id);

    if (!el) return;

    el.href =
      `${whatsappURL}?text=${encodeURIComponent(
        "Hola! Quería consultar por Pilchas Caballito 22."
      )}`;
  });


  // Instagram
  [
    "contactInstagram",
    "footerInstagram",
    "heroInstagram"
  ].forEach((id) => {

    const el = document.getElementById(id);

    if (!el) return;

    el.href = INSTAGRAM_URL;
  });
}


// =========================================================
// MENÚ MOBILE
// =========================================================

function setupMenu() {

  const btn = $("#menuBtn");
  const menu = $("#mobileMenu");

  if (!btn || !menu) return;

  btn.addEventListener("click", () => {

    const isOpen =
      menu.classList.toggle("open");

    btn.setAttribute(
      "aria-expanded",
      isOpen ? "true" : "false"
    );
  });


  $$("#mobileMenu a").forEach((a) => {

    a.addEventListener("click", () => {

      menu.classList.remove("open");

      btn.setAttribute(
        "aria-expanded",
        "false"
      );
    });
  });
}


// =========================================================
// SUPABASE — CARGAR PRODUCTOS
// =========================================================

async function loadProducts() {

  const {
    data,
    error
  } = await supabase
    .from("products")
    .select("*")
    .eq("active", true)
    .order("created_at", {
      ascending: false
    });


  if (error) {

    console.error(error);

    showToast(
      "No se pudo cargar el catálogo."
    );

    return;
  }


  state.products =
    data || [];

  renderFilters();
  renderProducts();
}


// =========================================================
// FILTROS
// =========================================================

function renderFilters() {

  const cats = [
    "Todos",
    ...new Set(
      state.products
        .map((p) => p.category)
        .filter(Boolean)
    )
  ];


  const box = $("#filters");

  if (!box) return;


  box.innerHTML =
    cats.map((category) => `

      <button
        class="filter ${
          category === state.category
            ? "active"
            : ""
        }"
        data-category="${escapeAttr(category)}"
        type="button"
      >
        ${escapeHtml(category)}
      </button>

    `).join("");


  $$(".filter").forEach((btn) => {

    btn.addEventListener("click", () => {

      state.category =
        btn.dataset.category;

      renderFilters();
      renderProducts();

    });
  });
}


// =========================================================
// MOSTRAR PRODUCTOS
// =========================================================

function renderProducts() {

  const grid =
    $("#productGrid");

  const empty =
    $("#emptyProducts");

  if (!grid || !empty) return;


  const list =
    state.category === "Todos"
      ? state.products
      : state.products.filter(
          (p) =>
            p.category ===
            state.category
        );


  if (!list.length) {

    grid.innerHTML = "";

    empty.classList.remove(
      "hidden"
    );

    return;
  }


  empty.classList.add(
    "hidden"
  );


  grid.innerHTML =
    list.map(productCard).join("");


  $$(".product-card").forEach((card) => {

    card.addEventListener(
      "click",
      () => openProduct(
        card.dataset.id
      )
    );

  });
}


// =========================================================
// TARJETA DE PRODUCTO
// =========================================================

function productCard(product) {

  const image =
    product.images?.[0] || "";


  return `

    <article
      class="product-card"
      data-id="${escapeAttr(product.id)}"
    >

      <div class="product-card-image">

        ${
          image
            ? `
              <img
                src="${escapeAttr(image)}"
                alt="${escapeAttr(product.name)}"
                loading="lazy"
              >
            `
            : `
              <div class="loading">
                SIN FOTO
              </div>
            `
        }

        ${
          product.featured
            ? `
              <span class="product-badge">
                NUEVO
              </span>
            `
            : ""
        }

      </div>


      <div class="product-card-info">

        <div class="product-card-category">
          ${escapeHtml(
            product.category ||
            "Indumentaria"
          )}
        </div>


        <h3 class="product-card-name">
          ${escapeHtml(product.name)}
        </h3>


        <div class="product-card-price">
          ${formatPrice(product.price)}
        </div>

      </div>

    </article>

  `;
}


// =========================================================
// ABRIR PRODUCTO
// =========================================================

function openProduct(id) {

  const product =
    state.products.find(
      (p) =>
        String(p.id) ===
        String(id)
    );


  if (!product) return;


  $("#modalCategory").textContent =
    product.category ||
    "INDUMENTARIA";


  $("#modalName").textContent =
    product.name;


  $("#modalPrice").textContent =
    formatPrice(product.price);


  $("#modalDescription").textContent =
    product.description ||
    "Consultá disponibilidad y talles por WhatsApp.";


  $("#modalSizes").innerHTML =
    (product.sizes || [])
      .map(
        (size) => `
          <span>
            ${escapeHtml(size)}
          </span>
        `
      )
      .join("");


  const mainImage =
    $("#modalImage");

  const images =
    product.images || [];


  if (mainImage) {

    mainImage.src =
      images[0] || "";

    mainImage.alt =
      product.name;
  }


  const thumbs =
    $("#modalThumbs");


  if (thumbs) {

    thumbs.innerHTML =
      images
        .map(
          (src, index) => `
            <img
              src="${escapeAttr(src)}"
              alt=""
              data-src="${escapeAttr(src)}"
              class="${
                index === 0
                  ? "selected"
                  : ""
              }"
            >
          `
        )
        .join("");


    $$("#modalThumbs img").forEach(
      (thumb) => {

        thumb.addEventListener(
          "click",
          () => {

            if (mainImage) {
              mainImage.src =
                thumb.dataset.src;
            }


            $$("#modalThumbs img")
              .forEach((img) =>
                img.classList.remove(
                  "selected"
                )
              );


            thumb.classList.add(
              "selected"
            );

          }
        );

      }
    );
  }


  // WhatsApp del producto

  const message =
    `Hola! Quería consultar por "${product.name}".`;


  const modalWhatsapp =
    $("#modalWhatsapp");


  if (modalWhatsapp) {

    modalWhatsapp.href =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;
  }


  // Agregar al carrito desde el modal

  addCartButtonToModal(product);


  $("#productModal")
    ?.classList
    .remove("hidden");


  document.body.style.overflow =
    "hidden";
}


// =========================================================
// BOTÓN AGREGAR AL CARRITO EN MODAL
// =========================================================

function addCartButtonToModal(product) {

  const modalInfo =
    document.querySelector(".modal-info");

  if (!modalInfo) return;


  let button =
    document.getElementById(
      "addToCartBtn"
    );


  if (!button) {

    button =
      document.createElement("button");

    button.id =
      "addToCartBtn";

    button.className =
      "btn btn-outline btn-large";

    modalInfo.appendChild(button);
  }


  button.type =
    "button";

  button.textContent =
    "Agregar al carrito +";


  button.onclick = (event) => {

    event.preventDefault();
    event.stopPropagation();

    addToCart(product);

  };
}


// =========================================================
// MODAL
// =========================================================

function setupModal() {

  $$("[data-close-modal]")
    .forEach((element) => {

      element.addEventListener(
        "click",
        closeModal
      );

    });


  document.addEventListener(
    "keydown",
    (event) => {

      if (event.key === "Escape") {
        closeModal();
      }

    }
  );
}


function closeModal() {

  const modal =
    $("#productModal");

  if (!modal) return;


  modal.classList.add(
    "hidden"
  );


  document.body.style.overflow =
    "";
}


// =========================================================
// CARRITO
// =========================================================

function setupCart() {

  createCartHTML();

  const cartButton =
    $("#cartButton");

  const cartClose =
    $("#cartClose");

  const cartOverlay =
    $("#cartOverlay");


  cartButton?.addEventListener(
    "click",
    openCart
  );


  cartClose?.addEventListener(
    "click",
    closeCart
  );


  cartOverlay?.addEventListener(
    "click",
    closeCart
  );


  document.addEventListener(
    "keydown",
    (event) => {

      if (
        event.key === "Escape"
      ) {
        closeCart();
      }

    }
  );
}


// =========================================================
// CREAR HTML DEL CARRITO
// =========================================================

function createCartHTML() {

  if (
    document.getElementById(
      "cartContainer"
    )
  ) {
    return;
  }


  const cartHTML = `

    <button
      id="cartButton"
      class="cart-button"
      type="button"
      aria-label="Abrir carrito"
    >
      <span class="cart-icon">
        🛒
      </span>

      <span>
        Carrito
      </span>

      <strong id="cartCount">
        0
      </strong>
    </button>


    <div
      id="cartContainer"
      class="cart-container hidden"
    >

      <div
        id="cartOverlay"
        class="cart-overlay"
      ></div>


      <aside
        class="cart-panel"
        aria-label="Carrito de compras"
      >

        <div class="cart-header">

          <div>
            <p class="cart-label">
              PC22 / SHOP
            </p>

            <h2>
              Tu carrito.
            </h2>
          </div>


          <button
            id="cartClose"
            class="cart-close"
            type="button"
            aria-label="Cerrar carrito"
          >
            ×
          </button>

        </div>


        <div
          id="cartItems"
          class="cart-items"
        ></div>


        <div
          id="cartEmpty"
          class="cart-empty"
        >
          <strong>
            TU CARRITO ESTÁ VACÍO
          </strong>

          <p>
            Agregá productos de la colección.
          </p>
        </div>


        <div
          id="cartFooter"
          class="cart-footer"
        >

          <div class="cart-total">

            <span>
              TOTAL
            </span>

            <strong
              id="cartTotal"
            >
              $0
            </strong>

          </div>


          <button
            id="checkoutWhatsapp"
            class="btn btn-green btn-large cart-checkout"
            type="button"
          >
            Finalizar por WhatsApp ↗
          </button>


          <button
            id="clearCart"
            class="cart-clear"
            type="button"
          >
            Vaciar carrito
          </button>

        </div>

      </aside>

    </div>
  `;


  document.body.insertAdjacentHTML(
    "beforeend",
    cartHTML
  );


  $("#checkoutWhatsapp")
    ?.addEventListener(
      "click",
      checkoutWhatsApp
    );


  $("#clearCart")
    ?.addEventListener(
      "click",
      clearCart
    );
}


// =========================================================
// AGREGAR PRODUCTO AL CARRITO
// =========================================================

function addToCart(product) {

  const existing =
    state.cart.find(
      (item) =>
        String(item.id) ===
        String(product.id)
    );


  if (existing) {

    existing.quantity += 1;

  } else {

    state.cart.push({

      id:
        product.id,

      name:
        product.name,

      price:
        Number(product.price) || 0,

      image:
        product.images?.[0] || "",

      quantity:
        1
    });
  }


  saveCart();
  updateCartUI();

  showToast(
    `${product.name} agregado al carrito.`
  );
}


// =========================================================
// CAMBIAR CANTIDAD
// =========================================================

function changeQuantity(id, amount) {

  const item =
    state.cart.find(
      (product) =>
        String(product.id) ===
        String(id)
    );


  if (!item) return;


  item.quantity += amount;


  if (item.quantity <= 0) {

    state.cart =
      state.cart.filter(
        (product) =>
          String(product.id) !==
          String(id)
      );
  }


  saveCart();
  updateCartUI();
}


// =========================================================
// ELIMINAR PRODUCTO
// =========================================================

function removeFromCart(id) {

  state.cart =
    state.cart.filter(
      (item) =>
        String(item.id) !==
        String(id)
    );


  saveCart();
  updateCartUI();
}


// =========================================================
// VACIAR CARRITO
// =========================================================

function clearCart() {

  if (!state.cart.length) return;


  state.cart = [];

  saveCart();
  updateCartUI();

  showToast(
    "Carrito vacío."
  );
}


// =========================================================
// GUARDAR CARRITO
// =========================================================

function saveCart() {

  localStorage.setItem(
    "pc22_cart",
    JSON.stringify(
      state.cart
    )
  );
}


// =========================================================
// ACTUALIZAR CARRITO
// =========================================================

function updateCartUI() {

  const itemsContainer =
    $("#cartItems");

  const empty =
    $("#cartEmpty");

  const footer =
    $("#cartFooter");

  const count =
    $("#cartCount");

  const totalElement =
    $("#cartTotal");


  const totalQuantity =
    state.cart.reduce(
      (total, item) =>
        total +
        item.quantity,
      0
    );


  const totalPrice =
    state.cart.reduce(
      (total, item) =>
        total +
        item.price *
        item.quantity,
      0
    );


  if (count) {

    count.textContent =
      totalQuantity;
  }


  if (totalElement) {

    totalElement.textContent =
      formatPrice(
        totalPrice
      );
  }


  if (!itemsContainer) return;


  if (!state.cart.length) {

    itemsContainer.innerHTML =
      "";

    empty?.classList.remove(
      "hidden"
    );

    footer?.classList.add(
      "hidden"
    );

    return;
  }


  empty?.classList.add(
    "hidden"
  );

  footer?.classList.remove(
    "hidden"
  );


  itemsContainer.innerHTML =
    state.cart
      .map(cartItemHTML)
      .join("");


  // Menos

  $$(".cart-minus").forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          changeQuantity(
            button.dataset.id,
            -1
          );

        }
      );

    }
  );


  // Más

  $$(".cart-plus").forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          changeQuantity(
            button.dataset.id,
            1
          );

        }
      );

    }
  );


  // Eliminar

  $$(".cart-remove").forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          removeFromCart(
            button.dataset.id
          );

        }
      );

    }
  );
}


// =========================================================
// HTML DE CADA PRODUCTO DEL CARRITO
// =========================================================

function cartItemHTML(item) {

  return `

    <div
      class="cart-item"
      data-id="${escapeAttr(item.id)}"
    >

      <div class="cart-item-image">

        ${
          item.image
            ? `
              <img
                src="${escapeAttr(item.image)}"
                alt="${escapeAttr(item.name)}"
              >
            `
            : `
              <span>
                PC22
              </span>
            `
        }

      </div>


      <div class="cart-item-info">

        <h3>
          ${escapeHtml(item.name)}
        </h3>

        <p>
          ${formatPrice(item.price)}
        </p>


        <div class="cart-item-bottom">

          <div class="quantity">

            <button
              class="cart-minus"
              data-id="${escapeAttr(item.id)}"
              type="button"
            >
              −
            </button>

            <span>
              ${item.quantity}
            </span>

            <button
              class="cart-plus"
              data-id="${escapeAttr(item.id)}"
              type="button"
            >
              +
            </button>

          </div>


          <button
            class="cart-remove"
            data-id="${escapeAttr(item.id)}"
            type="button"
          >
            Eliminar
          </button>

        </div>

      </div>

    </div>

  `;
}


// =========================================================
// ABRIR CARRITO
// =========================================================

function openCart() {

  const container =
    $("#cartContainer");

  if (!container) return;


  container.classList.remove(
    "hidden"
  );

  document.body.style.overflow =
    "hidden";
}


// =========================================================
// CERRAR CARRITO
// =========================================================

function closeCart() {

  const container =
    $("#cartContainer");

  if (!container) return;


  container.classList.add(
    "hidden"
  );

  document.body.style.overflow =
    "";
}


// =========================================================
// FINALIZAR PEDIDO POR WHATSAPP
// =========================================================

function checkoutWhatsApp() {

  if (!state.cart.length) {

    showToast(
      "El carrito está vacío."
    );

    return;
  }


  const lines =
    state.cart.map(
      (item) => {

        const subtotal =
          item.price *
          item.quantity;

        return (
          `• ${item.name} x${item.quantity} — ${formatPrice(subtotal)}`
        );
      }
    );


  const total =
    state.cart.reduce(
      (sum, item) =>
        sum +
        item.price *
        item.quantity,
      0
    );


  const message = [
    "Hola! Quiero hacer un pedido en Pilchas Caballito 22.",
    "",
    ...lines,
    "",
    `TOTAL: ${formatPrice(total)}`,
    "",
    "¿Me confirman disponibilidad y cómo coordinamos la entrega?"
  ].join("\n");


  const url =
    `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
      message
    )}`;


  window.open(
    url,
    "_blank",
    "noopener"
  );
}


// =========================================================
// DEMO
// =========================================================

function showDemo() {

  state.products = [

    {
      id: "demo1",

      name:
        "Remera Oversize",

      category:
        "Remeras",

      price:
        35000,

      description:
        "Producto de ejemplo. Configurá Supabase para administrar el catálogo.",

      sizes:
        ["S", "M", "L", "XL"],

      images:
        [],

      featured:
        true
    },


    {
      id: "demo2",

      name:
        "Buzo PC22",

      category:
        "Buzos",

      price:
        55000,

      description:
        "Producto de ejemplo.",

      sizes:
        ["M", "L", "XL"],

      images:
        [],

      featured:
        false
    },


    {
      id: "demo3",

      name:
        "Campera Urbana",

      category:
        "Camperas",

      price:
        80000,

      description:
        "Producto de ejemplo.",

      sizes:
        ["S", "M", "L"],

      images:
        [],

      featured:
        false
    }

  ];


  renderFilters();
  renderProducts();
}


// =========================================================
// FORMATO DE PRECIO ARGENTINO
// =========================================================

function formatPrice(value) {

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {

    return "Consultar precio";
  }


  return new Intl.NumberFormat(
    "es-AR",
    {
      style:
        "currency",

      currency:
        "ARS",

      maximumFractionDigits:
        0
    }
  ).format(
    Number(value)
  );
}


// =========================================================
// SEGURIDAD HTML
// =========================================================

function escapeHtml(value = "") {

  return String(value)
    .replace(
      /[&<>"']/g,
      (char) => {

        return {
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[char];

      }
    );
}


function escapeAttr(value = "") {

  return escapeHtml(value);
}


// =========================================================
// TOAST
// =========================================================

function showToast(message) {

  const toast =
    $("#toast");

  if (!toast) return;


  toast.textContent =
    message;


  toast.classList.add(
    "show"
  );


  setTimeout(
    () => {

      toast.classList.remove(
        "show"
      );

    },
    2500
  );
}
