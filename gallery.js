(function () {
  const grid = document.getElementById("gallery-grid");
  const filters = document.getElementById("gallery-filters");
  const countEl = document.getElementById("gallery-count");
  const dialog = document.getElementById("gallery-lightbox");
  const lbImg = document.getElementById("lightbox-img");
  const lbCap = document.getElementById("lightbox-caption");
  if (!grid) return;

  let items = [];
  let active = "all";

  const labels = {
    all: "All",
    exterior: "Exterior",
    churchyard: "Churchyard",
    interior: "Interior",
    details: "Tower & details",
    local: "Local area",
  };

  const filterOrder = ["exterior", "churchyard", "interior", "details", "local"];

  function isLocalArea(caption) {
    const c = caption.toLowerCase().replace(/\.(jpe?g|png|webp)$/i, "").trim();
    if (/st\.?\s*michael|all angels|church of st|littleton|memorial|monument| tomb/.test(c)) {
      if (!c.includes("village green")) return false;
    }
    return (
      c.includes("village green") ||
      c.includes("roscoe gjr") ||
      c.includes("market street") ||
      c.includes("market place") ||
      c.includes("old market") ||
      c.includes("white hart") ||
      c.includes("star inn") ||
      c.includes("almshouse") ||
      /canal at penkridge|canal in penkridge|narrowboat/.test(c) ||
      c.includes("penkridge station") ||
      c.includes("penkridge railway") ||
      c.includes("vale gardens") ||
      c.includes("birch trees in the park") ||
      c.includes("valley of the penk") ||
      c.includes("deanery")
    );
  }

  function classifyTag(caption) {
    const c = caption.toLowerCase().replace(/\.(jpe?g|png|webp)$/i, "").trim();
    if (isLocalArea(caption)) return "local";
    if (c.includes("graveyard") || c.includes("churchyard") || c.includes("cross in st")) {
      return "churchyard";
    }
    if (
      c.includes("window exterior") ||
      c.includes("west tower") ||
      c.includes("east window exterior") ||
      c.includes("the tower of") ||
      c.includes("gargoyle") ||
      c.includes("peal board") ||
      c.includes("ordnance survey") ||
      c.includes(" bolt ") ||
      c.includes("tower 01")
    ) {
      return "details";
    }
    if (
      c.includes("interior") ||
      c.includes(" nave") ||
      c.includes("the nave") ||
      c.includes("organ") ||
      c.includes("chancel") ||
      c.includes("altar") ||
      c.includes("pulpit") ||
      c.includes("lavabo") ||
      c.includes("aisle chapel") ||
      c.includes("memorial") ||
      c.includes("monument") ||
      c.includes(" tomb") ||
      c.includes("littleton") ||
      c.includes("hatherton") ||
      c.includes("congreve") ||
      c.includes("effigy") ||
      c.includes("font") ||
      c.includes("pew") ||
      c.includes("tablet") ||
      c.includes("inscription") ||
      c.includes("double tomb") ||
      c.includes("high altar") ||
      c.includes("arms") ||
      c.includes("wynnesbury") ||
      c.includes("cockayne") ||
      c.includes("percy memorial") ||
      c.includes("hyacinthe")
    ) {
      return "interior";
    }
    return "exterior";
  }

  function renderFilterButtons() {
    const tags = new Set(items.map((i) => i.tag));
    filters.innerHTML = "";
    ["all", ...filterOrder.filter((k) => tags.has(k))].forEach((tag) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-filter" + (tag === active ? " is-active" : "");
      btn.textContent = labels[tag] || tag;
      btn.dataset.tag = tag;
      btn.addEventListener("click", () => {
        active = tag;
        filters.querySelectorAll(".gallery-filter").forEach((b) => {
          b.classList.toggle("is-active", b.dataset.tag === active);
        });
        renderGrid();
      });
      filters.appendChild(btn);
    });
  }

  function openLightbox(item) {
    lbImg.src = item.file;
    lbImg.alt = item.caption;
    lbCap.textContent = item.caption.replace(/\.(jpe?g|png|webp)$/i, "");
    if (dialog.showModal) dialog.showModal();
  }

  function renderGrid() {
    const visible = active === "all" ? items : items.filter((i) => i.tag === active);
    grid.innerHTML = "";
    const sorted = [...visible].sort((a, b) => {
      if (active === "all") {
        const churchA = a.tag === "local" ? 0 : 1;
        const churchB = b.tag === "local" ? 0 : 1;
        if (churchB !== churchA) return churchB - churchA;
      }
      const ra = a.rank ?? 0;
      const rb = b.rank ?? 0;
      if (rb !== ra) return rb - ra;
      return a.caption.localeCompare(b.caption, "en");
    });
    sorted.forEach((item) => {
      const li = document.createElement("li");
      li.className = "gallery-cell";
      const fig = document.createElement("figure");
      fig.className = "gallery-item";
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "gallery-thumb";
      btn.setAttribute("aria-label", "View larger: " + item.caption);
      const img = document.createElement("img");
      img.src = item.file;
      img.alt = item.caption;
      img.loading = "lazy";
      img.decoding = "async";
      img.addEventListener("error", () => {
        li.remove();
        if (countEl) {
          const n = grid.querySelectorAll(".gallery-cell").length;
          countEl.textContent = n + " photo" + (n === 1 ? "" : "s");
        }
      });
      btn.appendChild(img);
      btn.addEventListener("click", () => openLightbox(item));
      const cap = document.createElement("figcaption");
      cap.textContent = item.caption.replace(/\.(jpe?g|png|webp)$/i, "");
      fig.append(btn, cap);
      li.appendChild(fig);
      grid.appendChild(li);
    });
    if (countEl) {
      countEl.textContent =
        visible.length + " photo" + (visible.length === 1 ? "" : "s") +
        (active === "all" ? "" : " · " + (labels[active] || active));
    }
  }

  dialog?.querySelector(".lightbox-close")?.addEventListener("click", () => dialog.close());
  dialog?.addEventListener("click", (e) => {
    if (e.target === dialog) dialog.close();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && dialog?.open) dialog.close();
  });

  fetch("images/manifest.json")
    .then((r) => {
      if (!r.ok) throw new Error("manifest missing");
      return r.json();
    })
    .then((data) => {
      items = data.map((item) => ({
        ...item,
        tag: classifyTag(item.caption || ""),
      }));
      renderFilterButtons();
      renderGrid();
    })
    .catch(() => {
      grid.innerHTML =
        '<li class="gallery-error">Photos could not be loaded. Run <code>python3 scripts/fetch-gallery.py</code> from the project folder, then refresh.</li>';
    });
})();
