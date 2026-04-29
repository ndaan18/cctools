// ── Tag definitions ───────────────────────────────────────
// group "software" = what app/platform the tool runs in
// group "type"     = what kind of file/artifact it is
const TAG_DEFS = {
  // Software
  "after-effects":   { label: "After Effects",   group: "software" },
  "davinci-resolve": { label: "DaVinci Resolve",  group: "software" },
  "cinema-4d":       { label: "Cinema 4D",        group: "software" },
  "blender":         { label: "Blender",          group: "software" },
  "houdini":         { label: "Houdini",          group: "software" },
  "touchdesigner":   { label: "TouchDesigner",    group: "software" },
  "html":            { label: "HTML",             group: "software" },
  // Type
  "script":          { label: "Script",           group: "type" },
  "plugin":          { label: "Plugin",           group: "type" },
  "preset":          { label: "Preset",           group: "type" },
  "openfx":          { label: "OpenFX",           group: "type" },
  "expression":      { label: "Expression",       group: "type" },
  "tool":            { label: "Tool",             group: "type" },
  "shader":          { label: "Shader",           group: "type" },
  "template":        { label: "Template",         group: "type" },
  "generator":       { label: "Generator",        group: "type" },
};

// Order filter buttons appear in (only present tags are shown)
const TAG_ORDER = [
  "after-effects", "davinci-resolve", "cinema-4d", "blender", "houdini", "touchdesigner", "html",
  "script", "plugin", "preset", "openfx", "expression", "tool", "shader", "template", "generator",
];

function getTag(key) {
  return TAG_DEFS[key] || { label: key, group: "type" };
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
  const bar = document.getElementById("filter-bar");

  // Collect which tags are actually used, preserving TAG_ORDER
  const usedTags = TAG_ORDER.filter(key =>
    tools.some(t => Array.isArray(t.tags) && t.tags.includes(key))
  );

  // "All" button
  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn active";
  allBtn.dataset.filter = "all";
  allBtn.textContent = "All";
  bar.appendChild(allBtn);

  // Group buttons with a divider between software and type
  let lastGroup = null;
  usedTags.forEach(key => {
    const tag = getTag(key);

    // Insert divider when group changes
    if (lastGroup !== null && tag.group !== lastGroup) {
      const sep = document.createElement("span");
      sep.className = "filter-sep";
      sep.setAttribute("aria-hidden", "true");
      bar.appendChild(sep);
    }
    lastGroup = tag.group;

    const btn = document.createElement("button");
    btn.className = "filter-btn";
    btn.dataset.filter = key;
    btn.dataset.group = tag.group;
    btn.textContent = tag.label;
    bar.appendChild(btn);
  });

  bar.addEventListener("click", e => {
    const btn = e.target.closest(".filter-btn");
    if (!btn) return;
    bar.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    const search = document.getElementById("search")?.value.trim() || "";
    renderCards(btn.dataset.filter, search);
  });
}

// ── Card builder ──────────────────────────────────────────
function buildCard(tool) {
  const tags = Array.isArray(tool.tags) ? tool.tags : [];
  const isDownload = tool.action === "download";

  const card = document.createElement("article");
  card.className = "card";

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

  // Badges HTML
  const badgesHTML = tags.map(key => {
    const tag = getTag(key);
    return `<span class="badge" data-group="${tag.group}">${tag.label}</span>`;
  }).join("");

  // Body
  const body = document.createElement("div");
  body.className = "card-body";
  body.innerHTML = `
    <h2 class="card-title">${tool.name}</h2>
    <p class="card-desc">${tool.description}</p>
    <div class="card-footer">
      <div class="badge-row">${badgesHTML}</div>
      <a class="card-action"
         href="${tool.url}"
         ${isDownload ? "download" : 'target="_blank" rel="noopener"'}
         title="${isDownload ? "Download" : "Open link"}"
      >${isDownload ? ICON_DOWNLOAD : ICON_EXTERNAL}</a>
    </div>
  `;

  card.appendChild(preview);
  card.appendChild(body);

  // Whole card is clickable
  card.addEventListener("click", e => {
    if (e.target.closest(".card-action")) return;
    if (isDownload) {
      const a = Object.assign(document.createElement("a"), { href: tool.url, download: "" });
      a.click();
    } else {
      window.open(tool.url, "_blank", "noopener");
    }
  });

  // Squircle corners
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

  let filtered = filter === "all"
    ? tools
    : tools.filter(t => Array.isArray(t.tags) && t.tags.includes(filter));

  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(q) ||
      t.description.toLowerCase().includes(q) ||
      (t.tags || []).some(tag => getTag(tag).label.toLowerCase().includes(q))
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
  applySquircle(document.querySelector(".hero"), 28);
  buildFilters();
  renderCards();

  const input = document.getElementById("search");
  input.addEventListener("input", () => {
    const activeFilter = document.querySelector(".filter-btn.active")?.dataset.filter || "all";
    renderCards(activeFilter, input.value.trim());
  });
});
