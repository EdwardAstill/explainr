// @ts-nocheck
// Mobile drawer + topbar.
import { openSearchBar } from "./search";

const sidebarEl = document.getElementById("sidebar");
const scrim = document.getElementById("drawer-scrim");
const menuBtn = document.getElementById("mobile-menu-btn");
const searchBtn = document.getElementById("mobile-search-btn");

if (sidebarEl && scrim && menuBtn) {
  function openDrawer() {
    sidebarEl.classList.add("open");
    scrim.classList.add("open");
  }
  function closeDrawer() {
    sidebarEl.classList.remove("open");
    scrim.classList.remove("open");
  }

  menuBtn.addEventListener("click", () => {
    if (sidebarEl.classList.contains("open")) closeDrawer();
    else openDrawer();
  });

  scrim.addEventListener("click", closeDrawer);

  sidebarEl.addEventListener("click", (e) => {
    const a = e.target.closest("a[href]");
    if (a) closeDrawer();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768) closeDrawer();
  });

  searchBtn?.addEventListener("click", () => openSearchBar());
}
