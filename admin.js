const FIXED_RATIOS = ["4x5", "9x16"];

let manifest = { order: { "4x5": [], "9x16": [] }, items: [] };

const LONG_PRESS_MS = 420;
const DRAG_ACTIVATE_PX = 8;
const LONG_PRESS_CANCEL_PX = 12;

let reorderDrag = null;
let reorderDocListeners = null;
let sessionCheckGen = 0;
let uploadInProgress = false;
let selectMode = false;
const selectedIds = new Set();

const loginScreen = document.getElementById("login-screen");
const adminApp = document.getElementById("admin-app");
const loginForm = document.getElementById("login-form");
const loginError = document.getElementById("login-error");
const uploadStatus = document.getElementById("upload-status");
const fileInput = document.getElementById("file-input");
const uploadDrop = document.getElementById("upload-drop");
const selectModeBtn = document.getElementById("select-mode-btn");
const selectionActions = document.getElementById("selection-actions");
const selectAllBtn = document.getElementById("select-all-btn");
const clearSelectionBtn = document.getElementById("clear-selection-btn");
const deleteSelectedBtn = document.getElementById("delete-selected-btn");
const cancelSelectBtn = document.getElementById("cancel-select-btn");
const selectionCount = document.getElementById("selection-count");
const syncBlobBtn = document.getElementById("sync-blob-btn");
const galleryCount = document.getElementById("gallery-count");

async function api(path, options = {}) {
  const res = await fetch(path, {
    credentials: "include",
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

const ADMIN_UNLOCK_KEY = "kamala_admin_unlocked";

async function checkSession() {
  showLogin();
  const gen = ++sessionCheckGen;
  try {
    const { authenticated } = await api("/api/auth/session");
    if (gen !== sessionCheckGen) return;
    if (authenticated === true && sessionStorage.getItem(ADMIN_UNLOCK_KEY) === "1") {
      showAdmin();
    } else {
      sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
      showLogin();
    }
  } catch {
    if (gen !== sessionCheckGen) return;
    sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
    showLogin();
  }
}

function showLogin() {
  loginScreen.hidden = false;
  adminApp.hidden = true;
  exitSelectMode();
}

function showAdmin() {
  loginScreen.hidden = true;
  adminApp.hidden = false;
  loadManifest();
}

function updateSelectionUi() {
  const n = selectedIds.size;
  selectionCount.textContent = `${n} selected`;
  selectionCount.hidden = !selectMode;
  deleteSelectedBtn.disabled = n === 0;
  deleteSelectedBtn.textContent =
    n === 0 ? "Delete selected" : `Delete selected (${n})`;
}

function exitSelectMode() {
  endReorderDrag();
  selectMode = false;
  selectedIds.clear();
  adminApp.classList.remove("is-select-mode");
  selectModeBtn.hidden = false;
  selectionActions.hidden = true;
  selectionCount.hidden = true;
  updateSelectionUi();
}

function enterSelectMode() {
  endReorderDrag();
  selectMode = true;
  selectedIds.clear();
  adminApp.classList.add("is-select-mode");
  selectModeBtn.hidden = true;
  selectionActions.hidden = false;
  renderGrids();
  updateSelectionUi();
}

function toggleSelected(id) {
  if (selectedIds.has(id)) selectedIds.delete(id);
  else selectedIds.add(id);
  const on = selectedIds.has(id);
  document.querySelectorAll(`.admin-item[data-id="${id}"]`).forEach((el) => {
    el.classList.toggle("is-selected", on);
  });
  document.querySelectorAll(`.select-check[data-id="${id}"]`).forEach((el) => {
    el.checked = on;
  });
  updateSelectionUi();
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
    sessionStorage.setItem(ADMIN_UNLOCK_KEY, "1");
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
  sessionStorage.removeItem(ADMIN_UNLOCK_KEY);
  await api("/api/auth/logout", { method: "POST" });
  showLogin();
});

selectModeBtn?.addEventListener("click", () => enterSelectMode());
cancelSelectBtn?.addEventListener("click", () => {
  exitSelectMode();
  renderGrids();
});

selectAllBtn?.addEventListener("click", () => {
  for (const item of manifest.items) selectedIds.add(item.id);
  renderGrids();
  updateSelectionUi();
});

clearSelectionBtn?.addEventListener("click", () => {
  selectedIds.clear();
  renderGrids();
  updateSelectionUi();
});

deleteSelectedBtn?.addEventListener("click", () => deleteSelected());

async function deleteSelected() {
  const ids = [...selectedIds];
  if (!ids.length) return;

  const label = ids.length === 1 ? "this flyer" : `${ids.length} flyers`;
  if (!confirm(`Delete ${label}? This cannot be undone.`)) return;

  try {
    deleteSelectedBtn.disabled = true;
    uploadStatus.textContent = `Deleting ${ids.length} image(s)…`;

    const data = await api("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });

    uploadStatus.textContent = `Deleted ${data.deleted ?? ids.length} image(s).`;
    exitSelectMode();
    await loadManifest();
  } catch (err) {
    uploadStatus.textContent = err.message;
    updateSelectionUi();
  }
}

async function deleteOne(id) {
  if (!confirm("Delete this flyer?")) return;
  try {
    await api("/api/admin/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    uploadStatus.textContent = "Deleted.";
    await loadManifest();
  } catch (err) {
    uploadStatus.textContent = err.message;
  }
}

function updateGalleryCount() {
  const n = manifest.items?.length ?? 0;
  if (galleryCount) {
    galleryCount.textContent = n ? `${n} in gallery · Blob synced` : "No flyers yet";
  }
}

async function loadManifest() {
  uploadStatus.textContent = "Loading from Vercel Blob…";
  try {
    manifest = await api("/api/admin/manifest");
    renderGrids();
    updateGalleryCount();
    uploadStatus.textContent = manifest.items?.length
      ? `${manifest.items.length} flyer(s) loaded.`
      : "No flyers yet — upload or tap Sync from Blob.";
  } catch (err) {
    uploadStatus.textContent = err.message;
  }
}

syncBlobBtn?.addEventListener("click", async () => {
  syncBlobBtn.disabled = true;
  uploadStatus.textContent = "Syncing with Vercel Blob…";
  try {
    const data = await api("/api/admin/sync", { method: "POST" });
    manifest = data;
    renderGrids();
    updateGalleryCount();
    const parts = [];
    if (data.added) parts.push(`${data.added} added`);
    if (data.removed) parts.push(`${data.removed} removed`);
    uploadStatus.textContent = parts.length
      ? `Synced (${parts.join(", ")}). ${data.count} total.`
      : `Already in sync. ${data.count} flyer(s).`;
  } catch (err) {
    uploadStatus.textContent = err.message;
  } finally {
    syncBlobBtn.disabled = false;
  }
});

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
        const selected = selectedIds.has(item.id);
        return `
          <div
            class="admin-item${selected ? " is-selected" : ""}"
            data-id="${item.id}"
            data-ratio="${item.ratioKey}"
            style="--ar-w: ${item.ratioW}; --ar-h: ${item.ratioH}"
          >
            <input
              type="checkbox"
              class="select-check"
              data-id="${item.id}"
              aria-label="Select flyer"
              ${selected ? "checked" : ""}
              ${selectMode ? "" : "hidden"}
            />
            <img src="${item.url}" alt="" loading="lazy" draggable="false" />
            <button type="button" class="delete-btn" data-id="${item.id}" aria-label="Delete">×</button>
          </div>
        `;
      })
      .join("");

    bindGridEvents(grid, ratio);
  }
}

function clearReorderDocListeners() {
  if (!reorderDocListeners) return;
  const { move, up } = reorderDocListeners;
  document.removeEventListener("pointermove", move);
  document.removeEventListener("pointerup", up);
  document.removeEventListener("pointercancel", up);
  reorderDocListeners = null;
}

function moveReorderDrag(clientX, clientY) {
  if (!reorderDrag) return;
  const { item, grid } = reorderDrag;
  const under = document.elementFromPoint(clientX, clientY);
  const target = under?.closest?.(".admin-item");
  if (!target || target === item || target.parentElement !== grid) return;

  const rect = target.getBoundingClientRect();
  const after = clientX > rect.left + rect.width / 2;
  if (after) target.after(item);
  else target.before(item);
}

function endReorderDrag() {
  if (!reorderDrag) return;
  const { item, pointerId } = reorderDrag;
  item.classList.remove("is-dragging", "is-press-pending");
  if (item.hasPointerCapture?.(pointerId)) {
    item.releasePointerCapture(pointerId);
  }
  reorderDrag = null;
  document.body.classList.remove("is-reorder-dragging");
  clearReorderDocListeners();
  saveOrder();
}

function beginReorderDrag(item, grid, ratioKey, pointerId) {
  reorderDrag = { item, grid, ratioKey, pointerId };
  item.classList.remove("is-press-pending");
  item.classList.add("is-dragging");
  document.body.classList.add("is-reorder-dragging");
  item.setPointerCapture?.(pointerId);
  navigator.vibrate?.(12);

  const onMove = (e) => {
    if (!reorderDrag || e.pointerId !== reorderDrag.pointerId) return;
    e.preventDefault();
    moveReorderDrag(e.clientX, e.clientY);
  };

  const onUp = (e) => {
    if (!reorderDrag || e.pointerId !== reorderDrag.pointerId) return;
    e.preventDefault();
    endReorderDrag();
  };

  reorderDocListeners = { move: onMove, up: onUp };
  document.addEventListener("pointermove", onMove, { passive: false });
  document.addEventListener("pointerup", onUp, { passive: false });
  document.addEventListener("pointercancel", onUp, { passive: false });
}

function bindReorderPointer(item, grid, ratioKey) {
  item.addEventListener("contextmenu", (e) => {
    if (reorderDrag) e.preventDefault();
  });

  item.addEventListener("pointerdown", (e) => {
    if (selectMode || e.button !== 0) return;
    if (e.target.closest(".delete-btn") || e.target.closest(".select-check")) return;

    const useLongPress = e.pointerType === "touch";
    let activated = false;
    let pressTimer = null;
    const startX = e.clientX;
    const startY = e.clientY;

    const activate = () => {
      if (activated || selectMode) return;
      activated = true;
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      item.classList.remove("is-press-pending");
      beginReorderDrag(item, grid, ratioKey, e.pointerId);
    };

    const cancelPending = () => {
      if (pressTimer) {
        clearTimeout(pressTimer);
        pressTimer = null;
      }
      item.classList.remove("is-press-pending");
    };

    if (useLongPress) {
      item.classList.add("is-press-pending");
      pressTimer = setTimeout(activate, LONG_PRESS_MS);
    }

    const onPointerMove = (ev) => {
      if (ev.pointerId !== e.pointerId) return;

      if (activated) {
        ev.preventDefault();
        moveReorderDrag(ev.clientX, ev.clientY);
        return;
      }

      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      const dist = Math.hypot(dx, dy);

      if (useLongPress) {
        if (dist > LONG_PRESS_CANCEL_PX) cancelPending();
      } else if (dist > DRAG_ACTIVATE_PX) {
        activate();
        ev.preventDefault();
        moveReorderDrag(ev.clientX, ev.clientY);
      }
    };

    const onPointerUp = (ev) => {
      if (ev.pointerId !== e.pointerId) return;
      cancelPending();
      item.removeEventListener("pointermove", onPointerMove);
      item.removeEventListener("pointerup", onPointerUp);
      item.removeEventListener("pointercancel", onPointerUp);
      if (activated && reorderDrag) endReorderDrag();
    };

    item.addEventListener("pointermove", onPointerMove, { passive: false });
    item.addEventListener("pointerup", onPointerUp);
    item.addEventListener("pointercancel", onPointerUp);
  });
}

function bindGridEvents(grid, ratioKey) {
  grid.querySelectorAll(".admin-item").forEach((item) => {
    const id = item.dataset.id;

    if (selectMode) {
      item.addEventListener("click", (e) => {
        if (e.target.closest(".select-check")) return;
        toggleSelected(id);
      });
      const check = item.querySelector(".select-check");
      check?.addEventListener("change", (e) => {
        e.stopPropagation();
        if (check.checked) selectedIds.add(id);
        else selectedIds.delete(id);
        item.classList.toggle("is-selected", check.checked);
        updateSelectionUi();
      });
      return;
    }

    bindReorderPointer(item, grid, ratioKey);
  });

  if (!selectMode) {
    grid.querySelectorAll(".delete-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        e.stopPropagation();
        await deleteOne(btn.dataset.id);
      });
    });
  }
}

async function saveOrder() {
  if (selectMode) return;
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
