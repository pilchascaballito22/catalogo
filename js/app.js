import { supabase } from "./supabase.js";
import { STORE } from "./config.js";

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const state = { products: [], category: "Todos" };

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

function setupLinks() {
  const wa = `https://wa.me/${STORE.whatsapp}`;
  ["headerWhatsapp","mobileWhatsapp","heroInstagram","contactWhatsapp","contactInstagram"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id.includes("Whatsapp")) el.href = `${wa}?text=${encodeURIComponent("Hola! Quería consultar por Pilchas Caballito 22.")}`;
    else el.href = STORE.instagram;
  });
}

function setupMenu() {
  const btn = $("#menuBtn"), menu = $("#mobileMenu");
  btn?.addEventListener("click", () => menu.classList.toggle("open"));
  $$("#mobileMenu a").forEach(a => a.addEventListener("click", () => menu.classList.remove("open")));
}

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").eq("active", true).order("created_at", { ascending: false });
  if (error) {
    console.error(error);
    showToast("No se pudo cargar el catálogo.");
    return;
  }
  state.products = data || [];
  renderFilters();
  renderProducts();
}

function renderFilters() {
  const cats = ["Todos", ...new Set(state.products.map(p => p.category).filter(Boolean))];
  const box = $("#filters");
  box.innerHTML = cats.map(c => `<button class="filter ${c === state.category ? "active":""}" data-category="${escapeHtml(c)}">${escapeHtml(c)}</button>`).join("");
  $$(".filter").forEach(btn => btn.addEventListener("click", () => {
    state.category = btn.dataset.category;
    renderFilters();
    renderProducts();
  }));
}

function renderProducts() {
  const grid = $("#productGrid"), empty = $("#emptyProducts");
  const list = state.category === "Todos" ? state.products : state.products.filter(p => p.category === state.category);
  if (!list.length) {
    grid.innerHTML = "";
    empty.classList.remove("hidden");
    return;
  }
  empty.classList.add("hidden");
  grid.innerHTML = list.map(productCard).join("");
  $$(".product-card").forEach(card => card.addEventListener("click", () => openProduct(card.dataset.id)));
}

function productCard(p) {
  const image = p.images?.[0] || "";
  return `<article class="product-card" data-id="${p.id}">
    <div class="product-photo">
      ${image ? `<img src="${escapeAttr(image)}" alt="${escapeAttr(p.name)}" loading="lazy">` : `<div class="loading">SIN FOTO</div>`}
      ${p.featured ? `<span class="product-tag">Nuevo</span>` : ""}
    </div>
    <div class="product-data">
      <div class="product-category">${escapeHtml(p.category || "Indumentaria")}</div>
      <h3>${escapeHtml(p.name)}</h3>
      <div class="product-price">${formatPrice(p.price)}</div>
    </div>
  </article>`;
}

function openProduct(id) {
  const p = state.products.find(x => String(x.id) === String(id));
  if (!p) return;
  $("#modalCategory").textContent = p.category || "INDUMENTARIA";
  $("#modalName").textContent = p.name;
  $("#modalPrice").textContent = formatPrice(p.price);
  $("#modalDescription").textContent = p.description || "Consultá disponibilidad y talles por WhatsApp.";
  $("#modalSizes").innerHTML = (p.sizes || []).map(s => `<span>${escapeHtml(s)}</span>`).join("");
  const main = $("#modalImage");
  const images = p.images || [];
  main.src = images[0] || "";
  main.alt = p.name;
  $("#modalThumbs").innerHTML = images.map((src,i) => `<img src="${escapeAttr(src)}" alt="" data-src="${escapeAttr(src)}" class="${i===0?"selected":""}">`).join("");
  $$("#modalThumbs img").forEach(t => t.addEventListener("click", () => { main.src = t.dataset.src; }));
  $("#modalWhatsapp").href = `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(`Hola! Quería consultar por "${p.name}".`)}`;
  $("#productModal").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}

function setupModal() {
  $$("[data-close-modal]").forEach(x => x.addEventListener("click", closeModal));
  document.addEventListener("keydown", e => { if (e.key === "Escape") closeModal(); });
}
function closeModal() { $("#productModal").classList.add("hidden"); document.body.style.overflow = ""; }

function showDemo() {
  state.products = [
    {id:"demo1",name:"Remera Oversize",category:"Remeras",price:35000,description:"Producto de ejemplo. Configurá Supabase para administrar el catálogo.",sizes:["S","M","L","XL"],images:[],featured:true},
    {id:"demo2",name:"Buzo PC22",category:"Buzos",price:55000,description:"Producto de ejemplo.",sizes:["M","L","XL"],images:[],featured:false},
    {id:"demo3",name:"Campera Urbana",category:"Camperas",price:80000,description:"Producto de ejemplo.",sizes:["S","M","L"],images:[],featured:false}
  ];
  renderFilters(); renderProducts();
}

function formatPrice(value) {
  if (value === null || value === undefined || value === "") return "Consultar precio";
  return new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(Number(value));
}
function escapeHtml(v="") { return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function escapeAttr(v="") { return escapeHtml(v); }
function showToast(msg) { const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }
