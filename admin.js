const FIXED_RATIOS = ["4x5", "9x16"];

let manifest = { order: { "4x5": [], "9x16": [] }, items: [] };
let dragged = null;

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
  try {
    const { authenticated } = await api("/api/auth/session");
    if (authenticated) showAdmin();
    else showLogin();
  } catch {
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
  try {
    await api("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    showAdmin();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", async () => {
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

async function uploadFiles(files) {
  if (!files.length) return;
  uploadStatus.textContent = `Uploading ${files.length} file(s)…`;

  const form = new FormData();
  for (const file of files) form.append("files", file);

  try {
    const res = await fetch("/api/admin/upload", {
      method: "POST",
      credentials: "include",
      body: form,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Upload failed");
    uploadStatus.textContent = `Uploaded ${data.uploaded?.length || 0} file(s).`;
    await loadManifest();
  } catch (err) {
    uploadStatus.textContent = err.message;
  }
}

uploadDrop.addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  uploadFiles([...fileInput.files]);
  fileInput.value = "";
});

uploadDrop.addEventListener("dragover", (e) => {
  e.preventDefault();
  uploadDrop.classList.add("is-dragover");
});
uploadDrop.addEventListener("dragleave", () => uploadDrop.classList.remove("is-dragover"));
uploadDrop.addEventListener("drop", (e) => {
  e.preventDefault();
  uploadDrop.classList.remove("is-dragover");
  uploadFiles([...e.dataTransfer.files].filter((f) => f.type.startsWith("image/")));
});

checkSession();
