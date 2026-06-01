/**
 * Repudi Kamala Jeslyn — Portfolio
 */
const CONTACT_EMAIL = "kamalasamuel001@gmail.com";
const MANIFEST_URL = "public/flyers/manifest.json";
const ORDER_STORAGE_KEY = "kamala-portfolio-order";

const FIXED_RATIOS = [
  { ratioKey: "4x5", ratioW: 4, ratioH: 5 },
  { ratioKey: "9x16", ratioW: 9, ratioH: 16 },
];

let reorderMode = false;
let manifestOrder = { "4x5": [], "9x16": [] };
let draggedEl = null;

document.getElementById("year").textContent = new Date().getFullYear();

const emailLink = document.getElementById("email-link");
if (emailLink) {
  emailLink.href = `mailto:${CONTACT_EMAIL}`;
  emailLink.textContent = CONTACT_EMAIL;
}

const menuToggle = document.querySelector(".menu-toggle");
const nav = document.querySelector(".nav");

menuToggle?.addEventListener("click", () => {
  const open = nav.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", open);
});

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    nav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
  });
});

const lightbox = document.getElementById("lightbox");
const lightboxImg = document.getElementById("lightbox-img");
const closeBtn = lightbox?.querySelector(".lightbox-close");

function openLightbox(src, alt) {
  if (reorderMode) return;
  lightboxImg.src = src;
  lightboxImg.alt = alt;
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = "";
  document.body.style.overflow = "";
}

closeBtn?.addEventListener("click", closeLightbox);
lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && !lightbox.hidden) closeLightbox();
});

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}

function loadStoredOrder() {
  try {
    const raw = localStorage.getItem(ORDER_STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data && Array.isArray(data["4x5"]) && Array.isArray(data["9x16"])) return data;
  } catch {
    /* ignore */
  }
  return null;
}

function saveStoredOrder(order) {
  localStorage.setItem(ORDER_STORAGE_KEY, JSON.stringify(order));
}

function sortItemsIntoFixedRatios(items, order) {
  const byFile = Object.fromEntries(items.map((i) => [i.file, i]));
  const groups = {};

  for (const { ratioKey } of FIXED_RATIOS) {
    const files = order[ratioKey] || [];
    groups[ratioKey] = files.map((f) => byFile[f]).filter(Boolean);
  }

  return FIXED_RATIOS.map(({ ratioKey, ratioW, ratioH }) => ({
    ratioKey,
    ratioW,
    ratioH,
    items: groups[ratioKey] || [],
  }));
}

function renderGalleryItem(item, index, staggerIndex) {
  const alt = `Graphic design work ${index + 1} by Repudi Kamala Jeslyn`;
  const delay = Math.min(staggerIndex, 14) * 35;

  return `
    <article
      class="gallery-item"
      draggable="false"
      data-file="${escapeHtml(item.file)}"
      style="animation-delay: ${delay}ms"
    >
      <div
        class="gallery-frame"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(alt)}"
      >
        <span class="drag-handle" aria-hidden="true" title="Drag to reorder">⋮⋮</span>
        <img
          src="${escapeHtml(item.src)}"
          alt="${escapeHtml(alt)}"
          width="${item.width}"
          height="${item.height}"
          loading="lazy"
          draggable="false"
        />
      </div>
    </article>
  `;
}

function renderRatioSection({ ratioKey, ratioW, ratioH, items }, startIndex) {
  const cards = items
    .map((item, i) => renderGalleryItem(item, startIndex + i, i))
    .join("");

  return `
    <div
      class="gallery-ratio-block"
      data-ratio="${ratioKey}"
      data-ratio-w="${ratioW}"
      data-ratio-h="${ratioH}"
    >
      <div class="gallery-grid" data-sortable="${ratioKey}">
        ${cards || ""}
      </div>
    </div>
  `;
}

function getOrderFromDom() {
  const order = { "4x5": [], "9x16": [] };
  document.querySelectorAll(".gallery-grid[data-sortable]").forEach((grid) => {
    const key = grid.dataset.sortable;
    order[key] = [...grid.querySelectorAll(".gallery-item")].map((el) => el.dataset.file);
  });
  return order;
}

function bindLightbox(root) {
  root.querySelectorAll(".gallery-frame").forEach((frame) => {
    const img = frame.querySelector("img");
    frame.addEventListener("click", () => openLightbox(img.src, img.alt));
    frame.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        openLightbox(img.src, img.alt);
      }
    });
  });
}

function bindDragReorder() {
  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      if (!reorderMode) {
        e.preventDefault();
        return;
      }
      draggedEl = item;
      item.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", item.dataset.file);
    });

    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      draggedEl = null;
      document.querySelectorAll(".gallery-item").forEach((el) => el.classList.remove("is-drag-over"));
      const order = getOrderFromDom();
      saveStoredOrder(order);
      document.getElementById("save-order")?.removeAttribute("hidden");
    });

    item.addEventListener("dragover", (e) => {
      if (!reorderMode || !draggedEl) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const grid = item.closest(".gallery-grid");
      if (grid !== draggedEl.closest(".gallery-grid")) return;

      document.querySelectorAll(".gallery-item").forEach((el) => el.classList.remove("is-drag-over"));
      item.classList.add("is-drag-over");

      const rect = item.getBoundingClientRect();
      const after = e.clientY > rect.top + rect.height / 2;
      if (after) item.after(draggedEl);
      else item.before(draggedEl);
    });

    item.addEventListener("dragleave", () => item.classList.remove("is-drag-over"));
  });
}

function setReorderMode(on) {
  reorderMode = on;
  document.body.classList.toggle("reorder-mode", on);
  const btn = document.getElementById("toggle-reorder");
  btn?.setAttribute("aria-pressed", on ? "true" : "false");
  btn.textContent = on ? "Done" : "Reorder";

  document.querySelectorAll(".gallery-item").forEach((item) => {
    item.draggable = on;
  });
}

function downloadOrderJson(order) {
  const blob = new Blob([JSON.stringify(order, null, 2) + "\n"], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "order.json";
  a.click();
  URL.revokeObjectURL(a.href);
}

function canUseEditMode() {
  return (
    location.hostname === "localhost" ||
    location.hostname === "127.0.0.1" ||
    location.protocol === "file:" ||
    new URLSearchParams(location.search).has("edit")
  );
}

function setupEditNav() {
  const navEdit = document.getElementById("nav-edit");
  const toggleBtn = document.getElementById("toggle-reorder");
  const saveBtn = document.getElementById("save-order");

  if (!canUseEditMode() || !navEdit) return;

  document.body.classList.add("edit-mode");
  navEdit.hidden = false;

  toggleBtn?.addEventListener("click", () => setReorderMode(!reorderMode));

  saveBtn?.addEventListener("click", () => {
    const order = getOrderFromDom();
    saveStoredOrder(order);
    downloadOrderJson(order);
    saveBtn.textContent = "Saved!";
    setTimeout(() => {
      saveBtn.textContent = "Save";
    }, 2000);
  });
}

async function loadGallery() {
  const gallery = document.getElementById("gallery");

  try {
    const res = await fetch(MANIFEST_URL, { cache: "no-store" });
    if (!res.ok) throw new Error("manifest missing");
    const data = await res.json();
    const items = data.items || [];

    manifestOrder = data.order || { "4x5": [], "9x16": [] };
    const stored = loadStoredOrder();
    const order = stored || manifestOrder;

    const groups = sortItemsIntoFixedRatios(items, order);
    let index = 0;

    gallery.innerHTML = groups
      .filter((g) => g.items.length > 0)
      .map((group) => {
        const block = renderRatioSection(group, index);
        index += group.items.length;
        return block;
      })
      .join("");

    if (index === 0) return;

    gallery.classList.add("has-items");
    bindLightbox(gallery);
    bindDragReorder();
  } catch {
    /* silent */
  }
}

function initDreamProject() {
  const img = document.getElementById("dream-img");
  const placeholder = document.getElementById("dream-placeholder");
  const frame = document.getElementById("dream-frame");

  if (!img || !frame) return;

  const showPlaceholder = () => {
    frame.classList.add("is-placeholder");
    if (placeholder) placeholder.hidden = false;
  };

  img.addEventListener("error", showPlaceholder);
  if (!img.complete || img.naturalWidth === 0) {
    if (img.complete) showPlaceholder();
  }

  frame.addEventListener("click", () => {
    if (reorderMode || frame.classList.contains("is-placeholder")) return;
    openLightbox(img.src, img.alt);
  });

  frame.addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      if (!frame.classList.contains("is-placeholder")) {
        openLightbox(img.src, img.alt);
      }
    }
  });
}

setupEditNav();
loadGallery();
initDreamProject();
