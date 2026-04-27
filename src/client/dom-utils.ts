// @ts-nocheck
// Tiny DOM helpers shared across client modules.

export function escapeHtml(s) {
  const d = document.createElement("div");
  d.textContent = s;
  return d.innerHTML;
}

export function openOverlay(id) {
  closeAllOverlays();
  document.getElementById(id).classList.add("open");
}

export function closeAllOverlays() {
  document.querySelectorAll(".overlay.open").forEach((el) => el.classList.remove("open"));
}

export function isAnyOverlayOpen() {
  return !!document.querySelector(".overlay.open");
}
