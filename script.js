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
const lightboxPrev = document.getElementById("lightbox-prev");
const lightboxNext = document.getElementById("lightbox-next");

let lightboxSlides = [];
let lightboxIndex = 0;
let touchStartX = 0;
let touchStartY = 0;

function preloadLightboxNeighbors() {
  const n = lightboxSlides.length;
  if (n <= 1) return;
  const prev = (lightboxIndex - 1 + n) % n;
  const next = (lightboxIndex + 1) % n;
  for (const i of [prev, next]) {
    const img = new Image();
    img.decoding = "async";
    img.src = lightboxSlides[i].src;
  }
}

function showLightboxSlide(index) {
  if (!lightboxSlides.length) return;
  lightboxIndex = (index + lightboxSlides.length) % lightboxSlides.length;
  const slide = lightboxSlides[lightboxIndex];
  lightboxImg.src = slide.src;
  lightboxImg.alt = slide.alt;
  if (slide.width) lightboxImg.width = slide.width;
  else lightboxImg.removeAttribute("width");
  if (slide.height) lightboxImg.height = slide.height;
  else lightboxImg.removeAttribute("height");

  const hideNav = lightboxSlides.length <= 1;
  lightboxPrev.hidden = hideNav;
  lightboxNext.hidden = hideNav;
  preloadLightboxNeighbors();
}

function openLightbox(index) {
  if (!lightboxSlides.length) return;
  showLightboxSlide(index);
  lightbox.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  lightbox.hidden = true;
  lightboxImg.src = "";
  document.body.style.overflow = "";
}

function goLightbox(delta) {
  if (lightbox.hidden || lightboxSlides.length <= 1) return;
  showLightboxSlide(lightboxIndex + delta);
}

closeBtn?.addEventListener("click", (e) => {
  e.stopPropagation();
  closeLightbox();
});
lightboxPrev?.addEventListener("click", (e) => {
  e.stopPropagation();
  goLightbox(-1);
});
lightboxNext?.addEventListener("click", (e) => {
  e.stopPropagation();
  goLightbox(1);
});
lightbox?.addEventListener("click", (e) => {
  if (e.target === lightbox) closeLightbox();
});
document.addEventListener("keydown", (e) => {
  if (lightbox.hidden) return;
  if (e.key === "Escape") closeLightbox();
  if (e.key === "ArrowLeft") {
    e.preventDefault();
    goLightbox(-1);
  }
  if (e.key === "ArrowRight") {
    e.preventDefault();
    goLightbox(1);
  }
});

lightbox?.addEventListener(
  "touchstart",
  (e) => {
    if (lightbox.hidden || lightboxSlides.length <= 1) return;
    touchStartX = e.changedTouches[0].clientX;
    touchStartY = e.changedTouches[0].clientY;
  },
  { passive: true }
);

lightbox?.addEventListener(
  "touchend",
  (e) => {
    if (lightbox.hidden || lightboxSlides.length <= 1) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    if (dx < 0) goLightbox(1);
    else goLightbox(-1);
  },
  { passive: true }
);

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

function renderGalleryItem(item, index, priority) {
  const thumb = item.thumbUrl || item.url || item.src;
  const alt = `Graphic design work ${index + 1} by Repudi Kamala Jeslyn`;
  const delay = Math.min(priority, 14) * 35;
  const eager = priority < 8;

  return `
    <article class="gallery-item" style="animation-delay: ${delay}ms">
      <div
        class="gallery-frame"
        role="button"
        tabindex="0"
        data-lightbox-index="${index}"
        aria-label="${escapeHtml(alt)}"
      >
        <img
          src="${escapeHtml(thumb)}"
          alt="${escapeHtml(alt)}"
          width="${item.width || ""}"
          height="${item.height || ""}"
          loading="${eager ? "eager" : "lazy"}"
          decoding="async"
          ${eager ? 'fetchpriority="high"' : ""}
        />
      </div>
    </article>
  `;
}

function renderRatioSection({ ratioKey, ratioW, ratioH, items }, startIndex) {
  const cards = items
    .map((item, i) => renderGalleryItem(item, startIndex + i, startIndex + i))
    .join("");

  return `
    <div
      class="gallery-ratio-block"
      data-ratio="${ratioKey}"
      data-ratio-w="${ratioW}"
      data-ratio-h="${ratioH}"
    >
      <div class="gallery-grid">${cards}</div>
    </div>
  `;
}

function buildLightboxSlides(groups) {
  lightboxSlides = [];
  for (const { items } of groups) {
    for (const item of items) {
      lightboxSlides.push({
        src: item.url || item.src,
        alt: `Graphic design work ${lightboxSlides.length + 1} by Repudi Kamala Jeslyn`,
        width: item.width,
        height: item.height,
      });
    }
  }
}

function bindLightbox(root) {
  root.querySelectorAll(".gallery-frame").forEach((frame) => {
    frame.addEventListener("click", () => {
      const idx = Number(frame.dataset.lightboxIndex);
      if (!Number.isNaN(idx)) openLightbox(idx);
    });
    frame.addEventListener("keydown", (e) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const idx = Number(frame.dataset.lightboxIndex);
        if (!Number.isNaN(idx)) openLightbox(idx);
      }
    });
  });
}

function preconnectBlobOrigin(url) {
  try {
    const origin = new URL(url).origin;
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  } catch {
    /* ignore */
  }
}

async function fetchManifest() {
  const res = await fetch(API_FLYERS);
  if (!res.ok) throw new Error("Could not load gallery");
  return res.json();
}

async function loadGallery() {
  const gallery = document.getElementById("gallery");
  const loadingEl = document.getElementById("gallery-loading");

  try {
    const data = await fetchManifest();
    const items = data.items || [];
    const order = data.order || { "4x5": [], "9x16": [] };

    const firstUrl = items[0]?.thumbUrl || items[0]?.url;
    if (firstUrl) preconnectBlobOrigin(firstUrl);

    const groups = sortItemsIntoFixedRatios(items, order).filter((g) => g.items.length > 0);
    let index = 0;

    gallery.innerHTML = groups
      .map((group) => {
        const block = renderRatioSection(group, index);
        index += group.items.length;
        return block;
      })
      .join("");

    if (index === 0) return;

    buildLightboxSlides(groups);

    gallery.classList.add("has-items");
    bindLightbox(gallery);

    gallery.querySelectorAll(".gallery-ratio-block").forEach((block) => {
      block.classList.add("reveal");
      revealObserver.observe(block);
    });
  } catch {
    if (loadingEl) loadingEl.textContent = "Could not load gallery.";
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
