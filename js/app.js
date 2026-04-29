const categoryMeta = {
  "html-tool":  { label: "HTML Tool",     color: "var(--cyan)"   },
  "ae-plugin":  { label: "AE Script",     color: "var(--purple)" },
  "openfx":     { label: "OpenFX",        color: "var(--orange)" },
  "other":      { label: "Other",         color: "var(--green)"  },
};

function getCategoryMeta(category) {
  return categoryMeta[category] || { label: category, color: "var(--green)" };
}

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
    btn.style.setProperty("--badge-color", meta.color);
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

function buildCard(tool) {
  const meta = getCategoryMeta(tool.category);
  const card = document.createElement("article");
  card.className = "card";
  card.dataset.category = tool.category;

  const isDownload = tool.action === "download";
  const btnLabel = isDownload ? "Download" : "Open";
  const btnIcon  = isDownload
    ? `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>`
    : `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>`;

  card.innerHTML = `
    <div class="card-top">
      <span class="badge" style="--badge-color:${meta.color}">${meta.label}</span>
    </div>
    <h2 class="card-title">${tool.name}</h2>
    <p class="card-desc">${tool.description}</p>
    <a class="card-btn" href="${tool.url}" ${isDownload ? "download" : 'target="_blank" rel="noopener"'}>
      ${btnIcon} ${btnLabel}
    </a>
  `;
  return card;
}

function renderCards(filter = "all") {
  const grid = document.getElementById("grid");
  const empty = document.getElementById("empty");
  grid.innerHTML = "";

  const filtered = filter === "all" ? tools : tools.filter(t => t.category === filter);

  if (filtered.length === 0) {
    empty.hidden = false;
    return;
  }
  empty.hidden = true;
  filtered.forEach(tool => grid.appendChild(buildCard(tool)));
}

document.addEventListener("DOMContentLoaded", () => {
  buildFilters();
  renderCards();

  const input = document.getElementById("search");
  input.addEventListener("input", () => {
    const q = input.value.trim().toLowerCase();
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    const base = activeFilter === "all" ? tools : tools.filter(t => t.category === activeFilter);
    const grid = document.getElementById("grid");
    const empty = document.getElementById("empty");
    grid.innerHTML = "";
    const results = q ? base.filter(t =>
      t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
    ) : base;
    if (results.length === 0) { empty.hidden = false; return; }
    empty.hidden = true;
    results.forEach(tool => grid.appendChild(buildCard(tool)));
  });
});
