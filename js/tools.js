// ── Tool fields ───────────────────────────────────────────────────────────
// name        (string)   Display name
// description (string)   Short description shown on the card
// tags        (string[]) Any combination of tag keys defined in TAG_DEFS (app.js)
//               Software: "after-effects" | "davinci-resolve" | "cinema-4d" |
//                         "blender" | "html" | "touchdesigner" | "houdini"
//               Type:     "script" | "plugin" | "preset" | "openfx" | "expression" |
//                         "tool" | "shader" | "template" | "generator"
// action      (string)   "download" (serves a file) | "link" (opens a URL)
// url         (string)   Relative path to file in plugins/ or tools/, or full https:// URL
// image       (string)   Optional: path/URL to a preview image (e.g. "previews/stashex.png")

const tools = [
  {
    name: "SpeedTrace",
    description: "Drop a video and extract pose data frame by frame using MediaPipe. Outputs an .mgjson file you can import directly into After Effects, plus a raw .csv. Runs fully in-browser — nothing is uploaded.",
    tags: ["html", "tool"],
    action: "link",
    url: "tools/SpeedTrace.html",
  },
  {
    name: "StashEX",
    description: "Dockable expression library panel for After Effects. Save, organise, and apply expressions with their Effect Controls directly from the panel. Supports categories, favourites, import/export, and one-click apply with auto-created controllers.",
    tags: ["after-effects", "script"],
    action: "download",
    url: "plugins/StashEX.jsx",
    // image: "previews/stashex.png",
  },
  {
    name: "ColorSwap",
    description: "Swap colors across shapes, strokes, and fills in seconds. Pick the color you want to replace, choose a new one, done. No more clicking through layers one by one.",
    tags: ["after-effects", "script"],
    action: "download",
    url: "plugins/ColorSwap.jsx",
  },
];
