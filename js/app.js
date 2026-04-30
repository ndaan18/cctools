// ── Tag definitions ───────────────────────────────────────
// group "software" = what app/platform the tool runs in
// group "type"     = what kind of file/artifact it is
const TAG_DEFS = {
  // Software
  "after-effects":    { label: "After Effects",    group: "software" },
  "illustrator":      { label: "Illustrator",      group: "software" },
  "premiere-pro":     { label: "Premiere Pro",     group: "software" },
  "davinci-resolve":  { label: "DaVinci Resolve",  group: "software" },
  "cinema-4d":        { label: "Cinema 4D",        group: "software" },
  "touchdesigner":    { label: "TouchDesigner",    group: "software" },
  "html":             { label: "HTML",             group: "software" },
  // Type
  "script":           { label: "Script",           group: "type" },
  "plugin":           { label: "Plugin",           group: "type" },
  "preset":           { label: "Preset",           group: "type" },
  "expression":       { label: "Expression",       group: "type" },
  "tool":             { label: "Tool",             group: "type" },
  "shader":           { label: "Shader",           group: "type" },
  "template":         { label: "Template",         group: "type" },
  "generator":        { label: "Generator",        group: "type" },
  // Status
  "active":           { label: "Active",           group: "status" },
  "work-in-progress": { label: "WIP",              group: "status" },
  "archived":         { label: "Archived",         group: "status" },
};

// Order filter buttons appear in (only present tags are shown)
const TAG_ORDER = [
  "after-effects", "illustrator", "premiere-pro", "davinci-resolve", "cinema-4d", "touchdesigner", "html",
  "script", "plugin", "preset", "expression", "tool", "shader", "template", "generator",
  "active", "work-in-progress", "archived"
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

// ── Active filter state ───────────────────────────────────
// software / type : single-select (null = any), AND-ed together.
// shownStatuses   : multi-select Set of statuses whose tools ARE shown.
//                   Default: only "active". Toggling adds/removes from the set.
const activeFilters = {
  software:      null,
  type:          null,
  shownStatuses: new Set(["active"]),
};

function syncFilterButtons() {
  const bar = document.getElementById("filter-bar");
  const noneActive = !activeFilters.software && !activeFilters.type;

  let visibleSoftware = 0;
  let visibleType     = 0;

  bar.querySelectorAll(".filter-btn[data-group]").forEach(btn => {
    const key   = btn.dataset.filter;
    const group = btn.dataset.group;

    // ── Status: independent boolean toggles, always visible ───
    if (group === "status") {
      btn.classList.toggle("active", activeFilters.shownStatuses.has(key));
      btn.hidden = false;
      return;
    }

    // ── Software / Type: single-select with compatibility hiding ──
    btn.classList.toggle("active",
      key === activeFilters.software || key === activeFilters.type
    );

    const otherGroup  = group === "software" ? "type" : "software";
    const otherActive = activeFilters[otherGroup];

    const compatible = tools.some(t => {
      if (!Array.isArray(t.tags) || !t.tags.includes(key)) return false;
      if (otherActive && !t.tags.includes(otherActive)) return false;
      // Also require the tool's status to be in the currently shown set
      const statusTags = t.tags.filter(tag => TAG_DEFS[tag]?.group === "status");
      if (statusTags.length > 0 && !statusTags.some(s => activeFilters.shownStatuses.has(s))) return false;
      return true;
    });

    const isSelected = key === activeFilters[group];
    btn.hidden = !compatible && !isSelected;

    if (!btn.hidden) {
      if (group === "software") visibleSoftware++;
      else visibleType++;
    }
  });

  // Each separator knows which two groups it sits between via data-sep
  bar.querySelectorAll(".filter-sep").forEach(sep => {
    const [a, b] = (sep.dataset.sep || "").split("-");
    const countOf = g => bar.querySelectorAll(`.filter-btn[data-group="${g}"]:not([hidden])`).length;
    sep.hidden = countOf(a) === 0 || countOf(b) === 0;
  });

  // "All" button active when neither software nor type is selected
  const allBtn = bar.querySelector(".filter-btn[data-filter='all']");
  if (allBtn) allBtn.classList.toggle("active", noneActive);
}

// ── Filter bar ────────────────────────────────────────────
function buildFilters() {
  const bar = document.getElementById("filter-bar");

  // Only show tags that are actually used, in TAG_ORDER order
  const usedTags = TAG_ORDER.filter(key =>
    tools.some(t => Array.isArray(t.tags) && t.tags.includes(key))
  );

  // "All" button — starts active
  const allBtn = document.createElement("button");
  allBtn.className = "filter-btn active";
  allBtn.dataset.filter = "all";
  allBtn.textContent = "All";
  bar.appendChild(allBtn);

  // Group buttons with a divider between software and type
  let lastGroup = null;
  usedTags.forEach(key => {
    const tag = getTag(key);
    if (lastGroup !== null && tag.group !== lastGroup) {
      const sep = document.createElement("span");
      sep.className = "filter-sep";
      sep.dataset.sep = `${lastGroup}-${tag.group}`;
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

    if (btn.dataset.filter === "all") {
      activeFilters.software = null;
      activeFilters.type     = null;
      // Status resets to default (only active)
      activeFilters.shownStatuses = new Set(["active"]);
    } else if (btn.dataset.group === "status") {
      // Boolean toggle: add if missing, remove if present
      const key = btn.dataset.filter;
      if (activeFilters.shownStatuses.has(key)) {
        activeFilters.shownStatuses.delete(key);
      } else {
        activeFilters.shownStatuses.add(key);
      }
    } else {
      const group = btn.dataset.group;
      const key   = btn.dataset.filter;
      activeFilters[group] = activeFilters[group] === key ? null : key;
    }

    syncFilterButtons();
    applyFilters();
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
function applyFilters() {
  const grid  = document.getElementById("grid");
  const empty = document.getElementById("empty");
  const query = document.getElementById("search")?.value.trim().toLowerCase() || "";
  grid.innerHTML = "";

  let filtered = tools;

  // AND the two group filters together
  if (activeFilters.software)
    filtered = filtered.filter(t => Array.isArray(t.tags) && t.tags.includes(activeFilters.software));
  if (activeFilters.type)
    filtered = filtered.filter(t => Array.isArray(t.tags) && t.tags.includes(activeFilters.type));

  // Status: keep tools whose status tag is in the shown set.
  // Tools with no status tag are always shown.
  filtered = filtered.filter(t => {
    const statusTags = (t.tags || []).filter(tag => TAG_DEFS[tag]?.group === "status");
    if (statusTags.length === 0) return true;
    return statusTags.some(s => activeFilters.shownStatuses.has(s));
  });

  // Text search across name, description, and tag labels
  if (query) {
    filtered = filtered.filter(t =>
      t.name.toLowerCase().includes(query) ||
      t.description.toLowerCase().includes(query) ||
      (t.tags || []).some(tag => getTag(tag).label.toLowerCase().includes(query))
    );
  }

  if (filtered.length === 0) { empty.hidden = false; return; }
  empty.hidden = true;
  filtered.forEach(tool => grid.appendChild(buildCard(tool)));
}

// ── Init ──────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", () => {
  applySquircle(document.querySelector(".hero"), 28);
  buildFilters();
  syncFilterButtons();
  applyFilters();

  document.getElementById("search").addEventListener("input", applyFilters);
});
