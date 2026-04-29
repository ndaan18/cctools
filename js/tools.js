// ── Tool fields ───────────────────────────────────────────
// name        (string)  Display name
// description (string)  Short description shown on the card
// category    (string)  "html-tool" | "ae-plugin" | "openfx" | "other"
// action      (string)  "download" (serves file) | "link" (opens URL)
// url         (string)  Path to file in plugins/ folder, or full https:// URL
// image       (string)  Optional: path or URL to a preview image (e.g. "previews/stashex.png")

const tools = [
  {
    name: "SpeedTrace",
    description: "Drop a video and extract pose data frame by frame using MediaPipe. Outputs an .mgjson file you can import directly into After Effects, plus a raw .csv. Runs fully in-browser — nothing is uploaded.",
    category: "html-tool",
    action: "link",
    url: "tools/SpeedTrace.html",
  },
  {
    name: "StashEX",
    description: "Dockable expression library panel for After Effects. Save, organise, and apply expressions with their Effect Controls directly from the panel. Supports categories, favourites, import/export, and one-click apply with auto-created controllers.",
    category: "ae-plugin",
    action: "download",
    url: "plugins/StashEX.jsx",
    // image: "previews/stashex.png",
  },
  {
    name: "ColorSwap",
    description: "Swap colors across shapes, strokes, and fills in seconds. Pick the color you want to replace, choose a new one, done. No more clicking through layers one by one.",
    category: "ae-plugin",
    action: "download",
    url: "plugins/ColorSwap.jsx",
  },
];
