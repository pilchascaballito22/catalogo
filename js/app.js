import { supabase } from "./supabase.js";
import { STORE } from "./config.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = {
  products: [],
  category: "Todos"
};


// =========================================================
// INICIO
// =========================================================

document.addEventListener("DOMContentLoaded", async () => {

  setupLinks();
  setupMenu();
  setupModal();

  if (!supabase) {
    showDemo();
    return;
  }

  await loadProducts();
});


// =========================================================
// LINKS DE CONTACTO
// =========================================================

function setupLinks() {

  // Instagram oficial
  const instagram =
    "https://www.instagram.com/pilchas_caballito22/";

  // WhatsApp oficial
  const whatsapp =
    "5491130786998";

  const wa =
    `https://wa.me/${whatsapp}`;

  // WhatsApp
  [
    "headerWhatsapp",
    "mobileWhatsapp",
    "contactWhatsapp"
  ].forEach(id => {

    const el = document.getElementById(id);

    if (!el) return;

    el.href =
      `${wa}?text=${encodeURIComponent(
        "Hola! Quería consultar por Pilchas Caballito 22."
      )}`;

  });


  // Instagram
  [
    "contactInstagram",
    "footerInstagram",
    "heroInstagram"
  ].forEach(id => {

    const el = document.getElementById(id);

    if (!el) return;

    el.href = instagram;

  });

}


// =========================================================
// MENÚ MOBILE
// =========================================================

function setupMenu() {

  const btn = $("#menuBtn");
  const menu = $("#mobileMenu");

  btn?.addEventListener("click", () => {

    const isOpen =
      menu.classList.toggle("open");

    btn.setAttribute(
      "aria-expanded",
      isOpen ? "true" : "false"
    );

  });


  $$("#mobileMenu a").forEach(a => {

    a.addEventListener("click", () => {

      menu.classList.remove("open");

      btn?.setAttribute(
        "aria-expanded",
        "false"
      );

    });

  });

}


// =========================================================
// CARGAR PRODUCTOS
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
        .map(p => p.category)
        .filter(Boolean)
    )
  ];


  const box = $("#filters");

  if (!box) return;


  box.innerHTML =
    cats.map(c => `

      <button
        class="filter ${c === state.category ? "active" : ""}"
        data-category="${escapeHtml(c)}"
        type="button"
      >
        ${escapeHtml(c)}
      </button>

    `).join("");


  $$(".filter").forEach(btn => {

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
          p =>
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


  $$(".product-card").forEach(card => {

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

function productCard(p) {

  const image =
    p.images?.[0] || "";


  return `

    <article
      class="product-card"
      data-id="${p.id}"
    >

      <div class="product-card-image">

        ${
          image
            ? `
              <img
                src="${escapeAttr(image)}"
                alt="${escapeAttr(p.name)}"
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
          p.featured
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
            p.category ||
            "Indumentaria"
          )}
        </div>


        <h3 class="product-card-name">
          ${escapeHtml(p.name)}
        </h3>


        <div class="product-card-price">
          ${formatPrice(p.price)}
        </div>

      </div>

    </article>

  `;
}


// =========================================================
// ABRIR PRODUCTO
// =========================================================

function openProduct(id) {

  const p =
    state.products.find(
      x =>
        String(x.id) ===
        String(id)
    );


  if (!p) return;


  $("#modalCategory").textContent =
    p.category ||
    "INDUMENTARIA";


  $("#modalName").textContent =
    p.name;


  $("#modalPrice").textContent =
    formatPrice(p.price);


  $("#modalDescription").textContent =
    p.description ||
    "Consultá disponibilidad y talles por WhatsApp.";


  $("#modalSizes").innerHTML =
    (p.sizes || [])
      .map(
        s =>
          `<span>${escapeHtml(s)}</span>`
      )
      .join("");


  const main =
    $("#modalImage");


  const images =
    p.images || [];


  main.src =
    images[0] || "";


  main.alt =
    p.name;


  $("#modalThumbs").innerHTML =
    images
      .map(
        (src, i) => `

          <img
            src="${escapeAttr(src)}"
            alt=""
            data-src="${escapeAttr(src)}"
            class="${i === 0 ? "selected" : ""}"
          >

        `
      )
      .join("");


  $$("#modalThumbs img").forEach(t => {

    t.addEventListener(
      "click",
      () => {

        main.src =
          t.dataset.src;

        $$("#modalThumbs img")
          .forEach(img =>
            img.classList.remove(
              "selected"
            )
          );

        t.classList.add(
          "selected"
        );

      }
    );

  });


  // WhatsApp específico del producto

  const whatsapp =
    "5491130786998";


  const message =
    `Hola! Quería consultar por "${p.name}".`;


  $("#modalWhatsapp").href =
    `https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`;


  $("#productModal")
    .classList
    .remove("hidden");


  document.body.style.overflow =
    "hidden";

}


// =========================================================
// MODAL
// =========================================================

function setupModal() {

  $$("[data-close-modal]")
    .forEach(x => {

      x.addEventListener(
        "click",
        closeModal
      );

    });


  document.addEventListener(
    "keydown",
    e => {

      if (e.key === "Escape") {
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
// FORMATO DE PRECIO
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

function escapeHtml(v = "") {

  return String(v)
    .replace(
      /[&<>"']/g,
      m =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#039;"
        }[m])
    );

}


function escapeAttr(v = "") {

  return escapeHtml(v);

}


// =========================================================
// TOAST
// =========================================================

function showToast(msg) {

  const t =
    $("#toast");

  if (!t) return;


  t.textContent =
    msg;


  t.classList.add(
    "show"
  );


  setTimeout(
    () =>
      t.classList.remove(
        "show"
      ),
    2500
  );

}
