/**
 * Repudi Kamala Jeslyn — Portfolio
 */
const CONTACT_EMAIL = "kamalajeslyn000@gmail.com";
const API_FLYERS = "/api/flyers";

const FIXED_RATIOS = [
  { ratioKey: "4x5", ratioW: 4, ratioH: 5 },
  { ratioKey: "9x16", ratioW: 9, ratioH: 16 },
];

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

function sortItemsIntoFixedRatios(items, order) {
  const byId = Object.fromEntries(items.map((i) => [i.id || i.file, i]));
  const groups = {};

  for (const { ratioKey } of FIXED_RATIOS) {
    groups[ratioKey] = (order[ratioKey] || [])
      .map((id) => byId[id])
      .filter(Boolean);
  }

  return FIXED_RATIOS.map(({ ratioKey, ratioW, ratioH }) => ({
    ratioKey,
    ratioW,
    ratioH,
    items: groups[ratioKey] || [],
  }));
}

function renderGalleryItem(item, index, staggerIndex) {
  const src = item.url || item.src;
  const id = item.id || item.file;
  const alt = `Graphic design work ${index + 1} by Repudi Kamala Jeslyn`;
  const delay = Math.min(staggerIndex, 14) * 35;

  return `
    <article class="gallery-item" style="animation-delay: ${delay}ms">
      <div
        class="gallery-frame"
        role="button"
        tabindex="0"
        aria-label="${escapeHtml(alt)}"
      >
        <img
          src="${escapeHtml(src)}"
          alt="${escapeHtml(alt)}"
          width="${item.width || ""}"
          height="${item.height || ""}"
          loading="lazy"
        />
      </div>
    </article>
  `;
}

function renderRatioSection({ ratioKey, ratioW, ratioH, items }, startIndex) {
  const cards = items
    .map((item, i) => renderGalleryItem(item, startIndex + i, i))
    .join("");

  const ratioLabel = ratioKey === "4x5" ? "4∶5" : "9∶16";
  const ratioNote =
    ratioKey === "4x5" ? "Posters & portrait flyers" : "Vertical stories & reels";

  return `
    <div
      class="gallery-ratio-block"
      data-ratio="${ratioKey}"
      data-ratio-w="${ratioW}"
      data-ratio-h="${ratioH}"
    >
      <header class="gallery-ratio-head">
        <span class="gallery-ratio-label">${ratioLabel}</span>
        <span class="gallery-ratio-note">${ratioNote}</span>
      </header>
      <div class="gallery-grid">${cards}</div>
    </div>
  `;
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

async function fetchManifest() {
  const res = await fetch(API_FLYERS, { cache: "no-store" });
  if (!res.ok) throw new Error("Could not load gallery");
  return res.json();
}

async function loadGallery() {
  const gallery = document.getElementById("gallery");

  try {
    const data = await fetchManifest();
    const items = data.items || [];
    const order = data.order || { "4x5": [], "9x16": [] };

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

    gallery.querySelectorAll(".gallery-ratio-block").forEach((block) => {
      block.classList.add("reveal");
      revealObserver.observe(block);
    });
  } catch {
    /* silent */
  }
}

/* Scroll reveal */
const revealObserver = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    }
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
);

document.querySelectorAll(".reveal").forEach((el) => revealObserver.observe(el));

loadGallery();
