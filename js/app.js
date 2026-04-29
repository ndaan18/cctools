const categoryMeta = {
  "html-tool": { label: "HTML Tool" },
  "ae-plugin":  { label: "AE Script"  },
  "openfx":     { label: "OpenFX"     },
  "other":      { label: "Other"      },
};

function getCategoryMeta(category) {
  return categoryMeta[category] || { label: category };
}

// ── SVG icons ─────────────────────────────────────────────
const ICON_DOWNLOAD = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
  <polyline points="7 10 12 15 17 10"/>
  <line x1="12" y1="15" x2="12" y2="3"/>
</svg>`;

const ICON_EXTERNAL = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <line x1="7" y1="17" x2="17" y2="7"/>
  <polyline points="7 7 17 7 17 17"/>
</svg>`;

const ICON_PLACEHOLDER = `<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24"
  fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round">
  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
  <polyline points="21 15 16 10 5 21"/>
</svg>`;

// ── Filter bar ────────────────────────────────────────────
function buildFilters() {
  const present = [...new Set(tools.map(t => t.category))];
  const bar = document.getElementById("filter-bar");

  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn active";
  allBtn.dataset.filter = "all";
  allBtn.textContent = "All";
  bar.appendChild(allBtn);

  present.forEach(cat => {
    const meta = getCategoryMeta(cat);
    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.filter = cat;
    btn.textContent = meta.label;
    bar.appendChild(btn);
  });

  bar.addEventListener("click", e => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    bar.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    renderCards(btn.dataset.filter);
  });
}

// ── Card builder ──────────────────────────────────────────
function buildCard(tool) {
  const meta = getCategoryMeta(tool.category);
  const isDownload = tool.action === "download";

  const card = document.createElement("article");
  card.className = "card";
  card.dataset.category = tool.category;

  // Preview
  const preview = document.createElement("div");
  preview.className = "card-preview";
  if (tool.image) {
    const img = document.createElement("img");
    img.src = tool.image;
    img.alt = tool.name;
    img.loading = "lazy";
    preview.appendChild(img);
  } else {
    preview.innerHTML = `<div class="card-preview-placeholder">${ICON_PLACEHOLDER}</div>`;
  }

  // Body
  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <h2 class="card-title">${tool.name}</h2>
    <p class="card-desc">${tool.description}</p>
    <div class="card-footer">
      <span class="badge">${meta.label}</span>
      <a class="card-action"
         href="${tool.url}"
         ${isDownload ? "download" : 'target="_blank" rel="noopener"'}
         title="${isDownload ? "Download" : "Open link"}"
      >${isDownload ? ICON_DOWNLOAD : ICON_EXTERNAL}</a>
    </div>
  `;

  card.appendChild(preview);
  card.appendChild(body);

  // Apply squircle after card is in the DOM (ResizeObserver fires on first size)
  requestAnimationFrame(() => {
    applySquircle(card, 22);
    const action = card.querySelector(".card-action");
    if (action) applySquircle(action, 8);
  });

  return card;
}

// ── Render ────────────────────────────────────────────────
function renderCards(filter = "all", query = "") {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  grid.innerHTML = "";

  let filtered = filter === "all" ? tools : tools.filter(t => t.category === filter);
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  filtered.forEach(tool => grid.appendChild(buildCard(tool)));
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  // Squircle the hero banner
  applySquircle(document.querySelector(".hero"), 28);

  buildFilters();
  renderCards();

  const input = document.getElementById("search");
  input.addEventListener("input", () => {
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    renderCards(activeFilter, input.value.trim());
  });
});
