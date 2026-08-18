import { supabase, supabaseReady } from "./supabase.js";

const $ = (s) => document.querySelector(s);
const state = { products: [], editingId: null, existingImages: [] };

document.addEventListener("DOMContentLoaded", async () => {
  if (!supabase) {
    $("#loginError").textContent = "Configurá js/config.js con las credenciales de Supabase.";
    return;
  }
  const { data: { session } } = await supabase.auth.getSession();
  if (session) showApp(); else showAuth();
  supabase.auth.onAuthStateChange((_event, session) => session ? showApp() : showAuth());
  setupEvents();
});

function setupEvents() {
  $("#loginForm")?.addEventListener("submit", login);
  $("#logoutBtn")?.addEventListener("click", async () => await supabase.auth.signOut());
  $("#newProductBtn")?.addEventListener("click", () => openEditor());
  $("#productForm")?.addEventListener("submit", saveProduct);
  $("#productImages")?.addEventListener("change", previewNewFiles);
  $("#searchProducts")?.addEventListener("input", renderProducts);
  document.addEventListener("click", e => {
    if (e.target.matches("[data-close-editor]")) closeEditor();
    if (e.target.closest("[data-edit]")) openEditor(e.target.closest("[data-edit]").dataset.edit);
    if (e.target.closest("[data-delete]")) deleteProduct(e.target.closest("[data-delete]").dataset.delete);
  });
}

async function login(e) {
  e.preventDefault();
  $("#loginError").textContent = "";
  const { error } = await supabase.auth.signInWithPassword({
    email: $("#email").value.trim(),
    password: $("#password").value
  });
  if (error) $("#loginError").textContent = error.message;
}

async function showApp() {
  $("#authView").classList.add("hidden");
  $("#appView").classList.remove("hidden");
  await loadProducts();
}
function showAuth() {
  $("#authView").classList.remove("hidden");
  $("#appView").classList.add("hidden");
}

async function loadProducts() {
  const { data, error } = await supabase.from("products").select("*").order("created_at", {ascending:false});
  if (error) return toast(error.message);
  state.products = data || [];
  updateStats();
  renderProducts();
}

function updateStats() {
  $("#totalProducts").textContent = state.products.length;
  $("#activeProducts").textContent = state.products.filter(p => p.active).length;
  $("#featuredProducts").textContent = state.products.filter(p => p.featured).length;
}

function renderProducts() {
  const query = ($("#searchProducts").value || "").toLowerCase().trim();
  const list = state.products.filter(p => `${p.name} ${p.category}`.toLowerCase().includes(query));
  $("#adminProducts").innerHTML = list.length ? list.map(adminCard).join("") : `<div class="loading">No hay productos.</div>`;
}

function adminCard(p) {
  const image = p.images?.[0] || "";
  return `<article class="admin-product">
    <div class="admin-product-image">${image ? `<img src="${escapeAttr(image)}" alt="">` : ""}</div>
    <div class="admin-product-data">
      <small>${escapeHtml(p.category || "Indumentaria")} ${p.active ? "· publicado" : "· oculto"}</small>
      <h3>${escapeHtml(p.name)}</h3>
      <p>${formatPrice(p.price)}</p>
      <div class="admin-product-actions">
        <button class="small-btn" data-edit="${p.id}">Editar</button>
        <button class="small-btn delete" data-delete="${p.id}">Eliminar</button>
      </div>
    </div>
  </article>`;
}

function openEditor(id=null) {
  state.editingId = id;
  state.existingImages = [];
  $("#productForm").reset();
  $("#productId").value = "";
  $("#previewImages").innerHTML = "";
  $("#photoCount").textContent = "0 fotos";
  $("#formError").textContent = "";
  if (id) {
    const p = state.products.find(x => String(x.id) === String(id));
    if (!p) return;
    $("#editorTitle").textContent = "Editar producto.";
    $("#productId").value = p.id;
    $("#productName").value = p.name || "";
    $("#productPrice").value = p.price ?? "";
    $("#productCategory").value = p.category || "";
    $("#productFeatured").value = String(!!p.featured);
    $("#productDescription").value = p.description || "";
    $("#productSizes").value = (p.sizes || []).join(", ");
    state.existingImages = p.images || [];
    renderPreviews(state.existingImages);
  } else {
    $("#editorTitle").textContent = "Nuevo producto.";
  }
  $("#editorModal").classList.remove("hidden");
}

function closeEditor() { $("#editorModal").classList.add("hidden"); }

function previewNewFiles(e) {
  const files = [...e.target.files];
  const urls = files.map(f => URL.createObjectURL(f));
  renderPreviews([...state.existingImages, ...urls]);
  $("#photoCount").textContent = `${state.existingImages.length + files.length} fotos`;
}

function renderPreviews(urls) {
  $("#previewImages").innerHTML = urls.map(u => `<div><img src="${escapeAttr(u)}" alt=""></div>`).join("");
  $("#photoCount").textContent = `${urls.length} fotos`;
}

async function saveProduct(e) {
  e.preventDefault();
  const btn = $("#saveProductBtn");
  btn.disabled = true; btn.textContent = "Guardando...";
  $("#formError").textContent = "";
  try {
    const files = [...$("#productImages").files];
    const uploaded = [];
    for (const file of files) uploaded.push(await uploadImage(file));
    const images = [...state.existingImages, ...uploaded];
    const payload = {
      name: $("#productName").value.trim(),
      price: $("#productPrice").value ? Number($("#productPrice").value) : null,
      category: $("#productCategory").value.trim(),
      featured: $("#productFeatured").value === "true",
      description: $("#productDescription").value.trim(),
      sizes: $("#productSizes").value.split(",").map(x=>x.trim()).filter(Boolean),
      images,
      active: true
    };
    if (!payload.name || !payload.category) throw new Error("Completá nombre y categoría.");
    if (state.editingId) {
      const { error } = await supabase.from("products").update(payload).eq("id", state.editingId);
      if (error) throw error;
      toast("Producto actualizado.");
    } else {
      const { error } = await supabase.from("products").insert(payload);
      if (error) throw error;
      toast("Producto publicado.");
    }
    closeEditor();
    await loadProducts();
  } catch (err) {
    console.error(err);
    $("#formError").textContent = err.message || "No se pudo guardar.";
  } finally {
    btn.disabled = false; btn.textContent = "Guardar producto";
  }
}

async function uploadImage(file) {
  const safe = file.name.toLowerCase().replace(/[^a-z0-9._-]/g,"-");
  const path = `${crypto.randomUUID()}-${safe}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {upsert:false, contentType:file.type});
  if (error) throw error;
  const { data } = supabase.storage.from("product-images").getPublicUrl(path);
  return data.publicUrl;
}

async function deleteProduct(id) {
  const p = state.products.find(x => String(x.id) === String(id));
  if (!p) return;
  if (!confirm(`¿Eliminar "${p.name}"?`)) return;
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return toast(error.message);
  toast("Producto eliminado.");
  await loadProducts();
}

function formatPrice(v) {
  if (v === null || v === undefined || v === "") return "Consultar precio";
  return new Intl.NumberFormat("es-AR",{style:"currency",currency:"ARS",maximumFractionDigits:0}).format(Number(v));
}
function escapeHtml(v="") { return String(v).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m])); }
function escapeAttr(v="") { return escapeHtml(v); }
function toast(msg) { const t=$("#toast"); t.textContent=msg; t.classList.add("show"); setTimeout(()=>t.classList.remove("show"),2500); }
