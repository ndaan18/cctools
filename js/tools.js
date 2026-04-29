// ── Tool fields ───────────────────────────────────────────
// name        (string)  Display name
// description (string)  Short description shown on the card
// category    (string)  "html-tool" | "ae-plugin" | "openfx" | "other"
// action      (string)  "download" (serves file) | "link" (opens URL)
// url         (string)  Path to file in plugins/ folder, or full https:// URL
// image       (string)  Optional: path or URL to a preview image (e.g. "previews/stashex.png")

const tools = [
  {
    name: "Stash EX",
    description: "Dockable expression library panel for After Effects. Save, organise, and apply expressions with their Effect Controls directly from the panel. Supports categories, favourites, import/export, and one-click apply with auto-created controllers.",
    category: "ae-plugin",
    action: "download",
    url: "plugins/StashEX.jsx",
    // image: "previews/stashex.png",
  },
];
