const FIXED_RATIOS = ["4x5", "9x16"];

let manifest = { order: { "4x5": [], "9x16": [] }, items: [] };
let dragged = null;
let sessionCheckGen = 0;
let uploadInProgress = false;

const loginScreen = document.getElementById("login-screen");
const adminApp = document.getElementById("admin-app");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const uploadStatus = document.getElementById("upload-status");
const fileInput = document.getElementById("file-input");
const uploadDrop = document.getElementById("upload-drop");

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

async function checkSession() {
  const gen = ++sessionCheckGen;
  try {
    const { authenticated } = await api("/api/auth/session");
    if (gen !== sessionCheckGen) return;
    if (authenticated) showAdmin();
    else showLogin();
  } catch {
    if (gen !== sessionCheckGen) return;
    showLogin();
  }
}

function showLogin() {
  loginScreen.hidden = false;
  adminApp.hidden = true;
}

function showAdmin() {
  loginScreen.hidden = true;
  adminApp.hidden = false;
  loadManifest();
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const password = document.getElementById("password").value;
  const submitBtn = loginForm.querySelector('button[type="submit"]');
  submitBtn.disabled = true;
  try {
    sessionCheckGen++;
    await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    showAdmin();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  } finally {
    submitBtn.disabled = false;
  }
});

document.getElementById("logout-btn")?.addEventListener("click", async () => {
  sessionCheckGen++;
  await api("/api/auth/logout", { method: "POST" });
  showLogin();
});

async function loadManifest() {
  manifest = await api("/api/admin/manifest");
  renderGrids();
}

function renderGrids() {
  const byId = Object.fromEntries(manifest.items.map((i) => [i.id, i]));

  for (const ratio of FIXED_RATIOS) {
    const grid = document.getElementById(`grid-${ratio.replace(":", "x")}`);
    if (!grid) continue;
    const ids = manifest.order[ratio] || [];
    grid.innerHTML = ids
      .map((id) => {
        const item = byId[id];
        if (!item) return "";
        return `
          <div
            class="admin-item"
            draggable="true"
            data-id="${item.id}"
            data-ratio="${item.ratioKey}"
            style="--ar-w: ${item.ratioW}; --ar-h: ${item.ratioH}"
          >
            <img src="${item.url}" alt="" loading="lazy" />
            <button type="button" class="delete-btn" data-id="${item.id}" aria-label="Delete">×</button>
          </div>
        `;
      })
      .join("");

    bindGridEvents(grid, ratio);
  }
}

function bindGridEvents(grid, ratioKey) {
  grid.querySelectorAll(".admin-item").forEach((item) => {
    item.addEventListener("dragstart", (e) => {
      dragged = item;
      item.classList.add("is-dragging");
      e.dataTransfer.effectAllowed = "move";
    });
    item.addEventListener("dragend", () => {
      item.classList.remove("is-dragging");
      dragged = null;
      saveOrder();
    });
    item.addEventListener("dragover", (e) => {
      if (!dragged || dragged.dataset.ratio !== ratioKey) return;
      e.preventDefault();
      const rect = item.getBoundingClientRect();
      const after = e.clientX > rect.left + rect.width / 2;
      if (after) item.after(dragged);
      else item.before(dragged);
    });
  });

  grid.querySelectorAll(".delete-btn").forEach((btn) => {
    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      if (!confirm("Delete this flyer?")) return;
      try {
        await api("/api/admin/delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: btn.dataset.id }),
        });
        uploadStatus.textContent = "Deleted.";
        await loadManifest();
      } catch (err) {
        uploadStatus.textContent = err.message;
      }
    });
  });
}

async function saveOrder() {
  const order = { "4x5": [], "9x16": [] };
  for (const ratio of FIXED_RATIOS) {
    const grid = document.getElementById(`grid-${ratio.replace(":", "x")}`);
    order[ratio] = [...grid.querySelectorAll(".admin-item")].map((el) => el.dataset.id);
  }
  try {
    await api("/api/admin/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ order }),
    });
    manifest.order = order;
    uploadStatus.textContent = "Order saved.";
  } catch (err) {
    uploadStatus.textContent = err.message;
  }
}

function collectImageFiles(fileList) {
  return [...fileList].filter(
    (f) =>
      f.type.startsWith("image/") ||
      /\.(jpe?g|png|gif|webp|heic|heif|avif)$/i.test(f.name)
  );
}

function formatUploadSummary(data) {
  const n = data.count ?? data.uploaded?.length ?? 0;
  const s = data.summary;
  if (!s) return `Uploaded ${n} image(s).`;
  const parts = [];
  if (s["4x5"]) parts.push(`${s["4x5"]} → 4∶5`);
  if (s["9x16"]) parts.push(`${s["9x16"]} → 9∶16`);
  let msg = `Uploaded ${n} image(s)${parts.length ? ` (${parts.join(", ")})` : ""}.`;
  if (data.skipped?.length) {
    msg += ` Skipped ${data.skipped.length}.`;
  }
  return msg;
}

function readImageMeta(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({
        filename: file.name,
        width: img.naturalWidth,
        height: img.naturalHeight,
      });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image: ${file.name}`));
    };
    img.src = url;
  });
}

async function uploadFiles(fileList) {
  const files = collectImageFiles(fileList).sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { numeric: true, sensitivity: "base" })
  );

  if (!files.length) {
    uploadStatus.textContent = "No image files selected.";
    return;
  }
  if (uploadInProgress) return;

  uploadInProgress = true;
  uploadDrop?.classList.add("is-uploading");
  fileInput.disabled = true;
  uploadStatus.textContent = `Preparing ${files.length} image(s)…`;

  try {
    const metas = await Promise.all(files.map(readImageMeta));

    const { slots } = await api("/api/admin/upload-presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files: metas }),
    });

    for (let i = 0; i < files.length; i++) {
      const slot = slots[i];
      uploadStatus.textContent = `Uploading ${i + 1} of ${files.length} to Vercel Blob…`;

      const putRes = await fetch(slot.putUrl, {
        method: "PUT",
        headers: { "Content-Type": slot.contentType },
        body: files[i],
      });

      if (!putRes.ok) {
        throw new Error(`Upload failed for ${slot.file}`);
      }
    }

    uploadStatus.textContent = "Saving gallery…";

    const data = await api("/api/admin/upload-complete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots }),
    });

    uploadStatus.textContent = formatUploadSummary(data);
    await loadManifest();
  } catch (err) {
    uploadStatus.textContent = err.message;
  } finally {
    uploadInProgress = false;
    uploadDrop?.classList.remove("is-uploading");
    fileInput.disabled = false;
    fileInput.value = "";
  }
}

fileInput?.addEventListener("change", () => {
  if (fileInput.files?.length) uploadFiles(fileInput.files);
});

uploadDrop?.addEventListener("dragover", (e) => {
  e.preventDefault();
  e.stopPropagation();
  if (!uploadInProgress) uploadDrop.classList.add("is-dragover");
});
uploadDrop?.addEventListener("dragleave", (e) => {
  e.preventDefault();
  uploadDrop.classList.remove("is-dragover");
});
uploadDrop?.addEventListener("drop", (e) => {
  e.preventDefault();
  e.stopPropagation();
  uploadDrop.classList.remove("is-dragover");
  if (e.dataTransfer?.files?.length) uploadFiles(e.dataTransfer.files);
});

checkSession();
