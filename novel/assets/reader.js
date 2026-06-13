(() => {
  const root = document.documentElement;
  const themeKey = "astrans-reader-theme";
  const sizeKey = "astrans-reader-size";
  const lastKey = "astrans-reader-last";

  const storedTheme = localStorage.getItem(themeKey);
  if (storedTheme) root.dataset.theme = storedTheme;
  const storedSize = Number(localStorage.getItem(sizeKey));
  if (storedSize) root.style.setProperty("--reader-size", `${storedSize}px`);

  const themeButton = document.querySelector("#theme-toggle");
  themeButton?.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    root.dataset.theme = next;
    localStorage.setItem(themeKey, next);
  });

  const changeSize = (delta) => {
    const current = parseFloat(getComputedStyle(root).getPropertyValue("--reader-size")) || 20;
    const next = Math.max(16, Math.min(28, current + delta));
    root.style.setProperty("--reader-size", `${next}px`);
    localStorage.setItem(sizeKey, String(next));
  };
  document.querySelector("#font-down")?.addEventListener("click", () => changeSize(-1));
  document.querySelector("#font-up")?.addEventListener("click", () => changeSize(1));

  const toc = document.querySelector("#toc-panel");
  const tocToggle = document.querySelector("#toc-toggle");
  const closeToc = () => {
    if (!toc || !tocToggle) return;
    toc.hidden = true;
    tocToggle.setAttribute("aria-expanded", "false");
  };
  tocToggle?.addEventListener("click", () => {
    if (!toc) return;
    toc.hidden = !toc.hidden;
    tocToggle.setAttribute("aria-expanded", String(!toc.hidden));
  });
  document.querySelector("#toc-close")?.addEventListener("click", closeToc);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeToc();
    if (event.key === "ArrowLeft") document.querySelector('[rel="prev"]')?.click();
    if (event.key === "ArrowRight") document.querySelector('[rel="next"]')?.click();
  });

  const progress = document.querySelector("#reading-progress");
  if (progress) {
    localStorage.setItem(lastKey, location.href);
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - innerHeight;
      const amount = scrollable > 0 ? (scrollY / scrollable) * 100 : 0;
      progress.style.width = `${Math.min(100, Math.max(0, amount))}%`;
    };
    addEventListener("scroll", updateProgress, { passive: true });
    updateProgress();
  }

  const continueLink = document.querySelector("#continue-reading");
  const last = localStorage.getItem(lastKey);
  if (continueLink && last) {
    continueLink.href = last;
    continueLink.hidden = false;
  }

  const search = document.querySelector("#chapter-search");
  search?.addEventListener("input", () => {
    const query = search.value.trim().toLowerCase();
    document.querySelectorAll(".chapter-card").forEach((card) => {
      card.hidden = query !== "" && !card.dataset.search.includes(query);
    });
  });
})();
