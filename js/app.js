import { supabase } from "./supabase.js";
import { STORE } from "./config.js";

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

const CART_KEY = "pc22_cart";

const WHATSAPP_NUMBER = "5491130786998";

const INSTAGRAM_URL =
  "https://www.instagram.com/pilchas_caballito22/";

const state = {
  products: [],
  category: "Todos",
  cart: loadCart()
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
// LOCALSTORAGE
// =========================================================

function loadCart() {

  try {

    const saved =
      localStorage.getItem(CART_KEY);

    if (!saved) return [];

    const parsed =
      JSON.parse(saved);

    return Array.isArray(parsed)
      ? parsed
      : [];

  } catch (error) {

    console.error(
      "Error cargando carrito:",
      error
    );

    return [];
  }
}


function saveCart() {

  try {

    localStorage.setItem(
      CART_KEY,
      JSON.stringify(state.cart)
    );

  } catch (error) {

    console.error(
      "Error guardando carrito:",
      error
    );
  }
}


// =========================================================
// LINKS
// =========================================================

function setupLinks() {

  const whatsappURL =
    `https://wa.me/${WHATSAPP_NUMBER}`;

  const whatsappMessage =
    "Hola! Quería consultar por Pilchas Caballito 22.";

  [
    "headerWhatsapp",
    "mobileWhatsapp",
    "contactWhatsapp"
  ].forEach((id) => {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.href =
      `${whatsappURL}?text=${encodeURIComponent(
        whatsappMessage
      )}`;

  });


  [
    "contactInstagram",
    "footerInstagram",
    "heroInstagram"
  ].forEach((id) => {

    const element =
      document.getElementById(id);

    if (!element) return;

    element.href =
      INSTAGRAM_URL;

  });
}


// =========================================================
// MENÚ MOBILE
// =========================================================

function setupMenu() {

  const button =
    $("#menuBtn");

  const menu =
    $("#mobileMenu");

  if (!button || !menu) return;


  button.addEventListener(
    "click",
    () => {

      const isOpen =
        menu.classList.toggle("open");

      button.setAttribute(
        "aria-expanded",
        isOpen ? "true" : "false"
      );

    }
  );


  $$("#mobileMenu a").forEach(
    (link) => {

      link.addEventListener(
        "click",
        () => {

          menu.classList.remove(
            "open"
          );

          button.setAttribute(
            "aria-expanded",
            "false"
          );

        }
      );

    }
  );


  // Carrito desde el menú mobile

  const mobileCart =
    $("#mobileCartButton");

  mobileCart?.addEventListener(
    "click",
    () => {

      menu.classList.remove(
        "open"
      );

      button.setAttribute(
        "aria-expanded",
        "false"
      );

      openCart();

    }
  );
}


// =========================================================
// SUPABASE
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

  const categories = [
    "Todos",
    ...new Set(
      state.products
        .map(
          (product) =>
            product.category
        )
        .filter(Boolean)
    )
  ];


  const box =
    $("#filters");

  if (!box) return;


  box.innerHTML =
    categories
      .map(
        (category) => `

          <button
            class="filter ${
              category === state.category
                ? "active"
                : ""
            }"
            data-category="${escapeAttr(
              category
            )}"
            type="button"
          >
            ${escapeHtml(category)}
          </button>

        `
      )
      .join("");


  $$("#filters .filter").forEach(
    (button) => {

      button.addEventListener(
        "click",
        () => {

          state.category =
            button.dataset.category;

          renderFilters();
          renderProducts();

        }
      );

    }
  );
}


// =========================================================
// PRODUCTOS
// =========================================================

function renderProducts() {

  const grid =
    $("#productGrid");

  const empty =
    $("#emptyProducts");

  if (!grid || !empty) return;


  const products =
    state.category === "Todos"
      ? state.products
      : state.products.filter(
          (product) =>
            product.category ===
            state.category
        );


  if (!products.length) {

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
    products
      .map(productCard)
      .join("");


  $$("#productGrid .product-card")
    .forEach((card) => {

      card.addEventListener(
        "click",
        () => {

          openProduct(
            card.dataset.id
          );

        }
      );

    });
}


// =========================================================
// TARJETA PRODUCTO
// =========================================================

function productCard(product) {

  const image =
    product.images?.[0] || "";


  return `

    <article
      class="product-card"
      data-id="${escapeAttr(
        product.id
      )}"
    >

      <div class="product-card-image">

        ${
          image
            ? `
              <img
                src="${escapeAttr(image)}"
                alt="${escapeAttr(
                  product.name
                )}"
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
          ${escapeHtml(
            product.name
          )}
        </h3>


        <div class="product-card-price">
          ${formatPrice(
            product.price
          )}
        </div>

      </div>

    </article>

  `;
}


// =========================================================
// PRODUCTO MODAL
// =========================================================

function openProduct(id) {

  const product =
    state.products.find(
      (item) =>
        String(item.id) ===
        String(id)
    );


  if (!product) return;


  const category =
    $("#modalCategory");

  const name =
    $("#modalName");

  const price =
    $("#modalPrice");

  const description =
    $("#modalDescription");

  const sizes =
    $("#modalSizes");

  const image =
    $("#modalImage");

  const thumbs =
    $("#modalThumbs");

  const whatsapp =
    $("#modalWhatsapp");

  const addButton =
    $("#modalAddToCart");


  if (category) {

    category.textContent =
      product.category ||
      "INDUMENTARIA";
  }


  if (name) {

    name.textContent =
      product.name;
  }


  if (price) {

    price.textContent =
      formatPrice(
        product.price
      );
  }


  if (description) {

    description.textContent =
      product.description ||
      "Consultá disponibilidad y talles por WhatsApp.";
  }


  // Talles

  if (sizes) {

    sizes.innerHTML =
      (product.sizes || [])
        .map(
          (size) => `
            <span>
              ${escapeHtml(size)}
            </span>
          `
        )
        .join("");
  }


  // Imágenes

  const images =
    product.images || [];


  if (image) {

    image.src =
      images[0] || "";

    image.alt =
      product.name;
  }


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


    $$("#modalThumbs img")
      .forEach((thumb) => {

        thumb.addEventListener(
          "click",
          () => {

            if (image) {

              image.src =
                thumb.dataset.src;
            }


            $$("#modalThumbs img")
              .forEach(
                (img) =>
                  img.classList.remove(
                    "selected"
                  )
              );


            thumb.classList.add(
              "selected"
            );

          }
        );

      });
  }


  // WhatsApp

  const message =
    `Hola! Quería consultar por "${product.name}".`;


  if (whatsapp) {

    whatsapp.href =
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
        message
      )}`;
  }


  // BOTÓN EXISTENTE DEL HTML
  // No creamos otro botón.

  if (addButton) {

    addButton.onclick =
      (event) => {

        event.preventDefault();
        event.stopPropagation();

        addToCart(product);

      };
  }


  const modal =
    $("#productModal");

  if (modal) {

    modal.classList.remove(
      "hidden"
    );

    document.body.style.overflow =
      "hidden";
  }
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

      if (
        event.key === "Escape"
      ) {

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

  const cartButton =
    $("#cartButton");

  const cartClose =
    $("#cartClose");

  const cartOverlay =
    $("#cartOverlay");

  const continueShopping =
    $("#continueShopping");

  const checkout =
    $("#checkoutWhatsapp");

  const clear =
    $("#clearCart");


  // BOTÓN DEL HEADER

  cartButton?.addEventListener(
    "click",
    openCart
  );


  // CERRAR

  cartClose?.addEventListener(
    "click",
    closeCart
  );


  cartOverlay?.addEventListener(
    "click",
    closeCart
  );


  // SEGUIR COMPRANDO

  continueShopping?.addEventListener(
    "click",
    () => {

      closeCart();

      setTimeout(() => {

        $("#coleccion")
          ?.scrollIntoView({
            behavior: "smooth"
          });

      }, 100);

    }
  );


  // WHATSAPP

  checkout?.addEventListener(
    "click",
    checkoutWhatsApp
  );


  // VACIAR

  clear?.addEventListener(
    "click",
    clearCart
  );


  // ESC

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
// ABRIR CARRITO
// =========================================================

function openCart() {

  const drawer =
    $("#cartDrawer");

  const overlay =
    $("#cartOverlay");

  if (!drawer || !overlay) {
    return;
  }


  // Si está abierto el producto,
  // lo cerramos primero.

  closeModal();


  // IMPORTANTE:
  // usamos las clases del HTML existente.
  // NO creamos otro carrito.

  drawer.classList.add(
    "open"
  );

  overlay.classList.remove(
    "hidden"
  );


  drawer.setAttribute(
    "aria-hidden",
    "false"
  );


  document.body.style.overflow =
    "hidden";
}


// =========================================================
// CERRAR CARRITO
// =========================================================

function closeCart() {

  const drawer =
    $("#cartDrawer");

  const overlay =
    $("#cartOverlay");

  if (!drawer || !overlay) {
    return;
  }


  drawer.classList.remove(
    "open"
  );

  overlay.classList.add(
    "hidden"
  );


  drawer.setAttribute(
    "aria-hidden",
    "true"
  );


  document.body.style.overflow =
    "";
}


// =========================================================
// AGREGAR AL CARRITO
// =========================================================

function addToCart(product) {

  if (!product) return;


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

function changeQuantity(
  id,
  amount
) {

  const item =
    state.cart.find(
      (product) =>
        String(product.id) ===
        String(id)
    );


  if (!item) return;


  item.quantity += amount;


  if (
    item.quantity <= 0
  ) {

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
// ELIMINAR
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
// VACIAR
// =========================================================

function clearCart() {

  if (!state.cart.length) {
    return;
  }


  state.cart = [];

  saveCart();
  updateCartUI();


  showToast(
    "Carrito vacío."
  );
}


// =========================================================
// ACTUALIZAR CARRITO
// =========================================================

function updateCartUI() {

  const content =
    $("#cartContent");

  const empty =
    $("#cartEmpty");

  const footer =
    $("#cartFooter");

  const totalElement =
    $("#cartTotal");

  const count =
    $("#cartCount");

  const mobileCount =
    $("#mobileCartCount");


  const totalQuantity =
    state.cart.reduce(
      (total, item) =>
        total +
        Number(item.quantity || 0),
      0
    );


  const totalPrice =
    state.cart.reduce(
      (total, item) =>
        total +
        (
          Number(item.price) || 0
        ) *
        Number(
          item.quantity || 0
        ),
      0
    );


  // Contador header

  if (count) {

    count.textContent =
      totalQuantity;
  }


  // Contador mobile

  if (mobileCount) {

    mobileCount.textContent =
      totalQuantity;
  }


  // Total

  if (totalElement) {

    totalElement.textContent =
      formatPrice(
        totalPrice
      );
  }


  if (!content) return;


  // CARRITO VACÍO

  if (!state.cart.length) {

    content.innerHTML = "";

    empty?.classList.remove(
      "hidden"
    );

    footer?.classList.add(
      "hidden"
    );

    return;
  }


  // CARRITO CON PRODUCTOS

  empty?.classList.add(
    "hidden"
  );

  footer?.classList.remove(
    "hidden"
  );


  content.innerHTML =
    state.cart
      .map(cartItemHTML)
      .join("");


  // MENOS

  $$("#cartContent .cart-minus")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          changeQuantity(
            button.dataset.id,
            -1
          );

        }
      );

    });


  // MÁS

  $$("#cartContent .cart-plus")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          changeQuantity(
            button.dataset.id,
            1
          );

        }
      );

    });


  // ELIMINAR

  $$("#cartContent .cart-remove")
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          removeFromCart(
            button.dataset.id
          );

        }
      );

    });
}


// =========================================================
// ITEM DEL CARRITO
// =========================================================

function cartItemHTML(item) {

  const subtotal =
    (
      Number(item.price) || 0
    ) *
    Number(
      item.quantity || 0
    );


  return `

    <article
      class="cart-item"
      data-id="${escapeAttr(
        item.id
      )}"
    >

      <div class="cart-item-image">

        ${
          item.image
            ? `
              <img
                src="${escapeAttr(
                  item.image
                )}"
                alt="${escapeAttr(
                  item.name
                )}"
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
          ${escapeHtml(
            item.name
          )}
        </h3>


        <p>
          ${formatPrice(
            item.price
          )}
        </p>


        <div class="cart-item-bottom">

          <div class="quantity">

            <button
              class="cart-minus"
              data-id="${escapeAttr(
                item.id
              )}"
              type="button"
              aria-label="Disminuir cantidad"
            >
              −
            </button>


            <span>
              ${item.quantity}
            </span>


            <button
              class="cart-plus"
              data-id="${escapeAttr(
                item.id
              )}"
              type="button"
              aria-label="Aumentar cantidad"
            >
              +
            </button>

          </div>


          <button
            class="cart-remove"
            data-id="${escapeAttr(
              item.id
            )}"
            type="button"
          >
            Eliminar
          </button>

        </div>


        <strong class="cart-item-subtotal">
          ${formatPrice(
            subtotal
          )}
        </strong>

      </div>

    </article>

  `;
}


// =========================================================
// WHATSAPP CHECKOUT
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
          (
            Number(item.price) || 0
          ) *
          Number(
            item.quantity || 0
          );


        return (
          `• ${item.name} x${item.quantity} — ${formatPrice(
            subtotal
          )}`
        );

      }
    );


  const total =
    state.cart.reduce(
      (sum, item) =>
        sum +
        (
          Number(item.price) || 0
        ) *
        Number(
          item.quantity || 0
        ),
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
    "noopener,noreferrer"
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
// PRECIO
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
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0
    }
  ).format(
    Number(value)
  );
}


// =========================================================
// SEGURIDAD
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
