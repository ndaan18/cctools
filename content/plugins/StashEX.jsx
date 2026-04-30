// StashEX.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Stash EX — Your expression library for After Effects
// INSTALL: Copy to .../Adobe After Effects <ver>/Scripts/ScriptUI Panels/
// OPEN:    Window menu → StashEX.jsx
// NEEDS:   AE Preferences → Scripting & Expressions → Allow Scripts to Write Files
// ─────────────────────────────────────────────────────────────────────────────

(function StashEX(thisObj) {

    // ═══════════════════════════════════════════════════════════
    // JSON POLYFILL
    // ═══════════════════════════════════════════════════════════
    if (typeof JSON === "undefined") { JSON = {}; }
    if (typeof JSON.stringify !== "function") {
        JSON.stringify = function(val) {
            var t = typeof val;
            if (val === null)    return "null";
            if (t === "boolean") return val ? "true" : "false";
            if (t === "number")  return isFinite(val) ? String(val) : "null";
            if (t === "string")  return '"' + val.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r").replace(/\t/g,"\\t") + '"';
            if (t === "object") {
                var out = [], k;
                if (val instanceof Array) {
                    for (var i = 0; i < val.length; i++) out.push(JSON.stringify(val[i]));
                    return "[" + out.join(",") + "]";
                }
                for (k in val) { if (val.hasOwnProperty(k)) out.push(JSON.stringify(k) + ":" + JSON.stringify(val[k])); }
                return "{" + out.join(",") + "}";
            }
            return "null";
        };
    }
    if (typeof JSON.parse !== "function") {
        JSON.parse = function(str) { return eval("(" + str + ")"); };
    }

    // ═══════════════════════════════════════════════════════════
    // DATA & PERSISTENCE
    // ═══════════════════════════════════════════════════════════
    var DEFAULT_CATS  = ["Motion", "Design"];
    var DEFAULT_EXPRS = [
        { name: "Wiggle", category: "Motion", favourite: false, code: "wiggle(2, 30)", description: "Random position noise.", controllers: [] },
        { name: "Corner Smoothing", category: "Design", favourite: true,
          description: "Smooth rounded rectangle with Figma-style squircle blending. Apply to a Path property.",
          controllers: [
            { name: "Width",      type: "slider", min: 0, defaultVal: 500,  max: 5000 },
            { name: "Height",     type: "slider", min: 0, defaultVal: 500,  max: 5000 },
            { name: "Radius",     type: "slider", min: 0, defaultVal: 0,    max: 1000 },
            { name: "Smoothing",  type: "slider", min: 0, defaultVal: 0,    max: 100  },
            { name: "Text Box",   type: "checkbox", defaultVal: false },
            { name: "Margin X",   type: "slider", min: 0, defaultVal: 20,   max: 100  },
            { name: "Margin Y",   type: "slider", min: 0, defaultVal: 20,   max: 100  }
          ],
          code: "// ── Slider controls (add these as Expression Controls) ────\n// Effect > Expression Controls > Slider Control × 4\n// Named: \"Width\", \"Height\", \"Radius\", \"Smoothing\"\n\nvar W = effect(\"Width\")(\"Slider\");\nvar H = effect(\"Height\")(\"Slider\");\nvar R = effect(\"Radius\")(\"Slider\");\nvar S = effect(\"Smoothing\")(\"Slider\"); // 0 to 100\n\n// ── Clamp radius ──────────────────────────────────────────\nvar maxR = Math.min(W, H) / 2;\nvar r    = Math.min(Math.max(R, 0), maxR);\n\n// ── Figma smoothing math ──────────────────────────────────\nvar t      = Math.min(Math.max(S, 0), 100) / 100;\nvar handle = r * (0.5523 + t * 0.4477);\n\n// ── Half dimensions ───────────────────────────────────────\nvar hw = W / 2;\nvar hh = H / 2;\n\n// ── Path construction ─────────────────────────────────────\nvar anchors = [\n  [-hw + r, -hh],\n  [ hw - r, -hh],\n  [ hw, -hh + r],\n  [ hw,  hh - r],\n  [ hw - r,  hh],\n  [-hw + r,  hh],\n  [-hw,  hh - r],\n  [-hw, -hh + r]\n];\n\nvar inTangents = [\n  [-handle,  0],\n  [      0,  0],\n  [  0, -handle],\n  [      0,  0],\n  [ handle,  0],\n  [      0,  0],\n  [  0,  handle],\n  [      0,  0]\n];\n\nvar outTangents = [\n  [      0,  0],\n  [ handle,  0],\n  [      0,  0],\n  [  0,  handle],\n  [      0,  0],\n  [-handle,  0],\n  [      0,  0],\n  [  0, -handle]\n];\n\ncreatePath(anchors, inTangents, outTangents, true);"
        }
    ];

    var DATA_FOLDER  = Folder.myDocuments.absoluteURI + "/StashEX";
    var DATA_FILE    = DATA_FOLDER + "/data.json";
    var PREFS_FILE   = DATA_FOLDER + "/prefs.json"; // stores last ctrl placement choice

    function ensureFolder() { var f = new Folder(DATA_FOLDER); if (!f.exists) f.create(); }

    function loadData() {
        var e = DEFAULT_EXPRS, c = DEFAULT_CATS.slice();
        try {
            ensureFolder();
            var f = File(DATA_FILE);
            if (f.exists) {
                f.open("r"); var raw = f.readln(); f.close();
                if (raw && raw.length > 0) {
                    var p = JSON.parse(raw);
                    if (p.exprs && p.exprs.length > 0) e = p.exprs;
                    if (p.cats  && p.cats.length  > 0) c = p.cats;
                }
            } else { persist(e, c); }
        } catch(_) { e = DEFAULT_EXPRS; c = DEFAULT_CATS.slice(); }
        return { exprs: e, cats: c };
    }

    function persist(exprs, cats) {
        try {
            ensureFolder();
            var f = File(DATA_FILE);
            f.open("w"); f.writeln(JSON.stringify({ exprs: exprs, cats: cats })); f.close();
        } catch(err) { alert("Save failed:\n" + err.toString()); }
    }

    // ── Prefs (last controller placement choice) ──────────────
    function loadPrefs() {
        try {
            var f = File(PREFS_FILE);
            if (f.exists) { f.open("r"); var raw = f.readln(); f.close(); if (raw) return JSON.parse(raw); }
        } catch(_) {}
        return { ctrlMode: "layer" };
    }

    function savePrefs(prefs) {
        try { ensureFolder(); var f = File(PREFS_FILE); f.open("w"); f.writeln(JSON.stringify(prefs)); f.close(); } catch(_) {}
    }

    // ═══════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════
    function trim(s) { return s.replace(/^\s+|\s+$/g, ""); }

    function tip(ctrl, msg, bar) {
        ctrl.addEventListener("mouseover", function() { bar.text = "\u2192  " + msg; });
        ctrl.addEventListener("mouseout",  function() { bar.text = ""; });
    }

    function separator(parent) {
        var g = parent.add("group"); g.preferredSize = [-1, 1]; g.margins = [0, 2, 0, 2]; return g;
    }

    function getSelectedProps(layer) {
        var out = [];
        function walk(pg) {
            for (var i = 1; i <= pg.numProperties; i++) {
                var p = pg.property(i);
                if (p.selected && p.canSetExpression) out.push(p);
                if (p.numProperties) walk(p);
            }
        }
        walk(layer); return out;
    }

    // ═══════════════════════════════════════════════════════════
    // CODE WARNING — detect effect("NAME") refs with no matching controller
    // Returns array of unmatched names, or empty array if all OK.
    // ═══════════════════════════════════════════════════════════
    function getMissingControllerRefs(code, controllers) {
        var missing = [];
        var re = /effect\(\s*["']([^"']+)["']\s*\)/g;
        var match;
        var ctrlNames = {};
        for (var ci = 0; ci < controllers.length; ci++) ctrlNames[controllers[ci].name] = true;
        while ((match = re.exec(code)) !== null) {
            var refName = match[1];
            if (!ctrlNames[refName]) {
                var alreadyListed = false;
                for (var mi = 0; mi < missing.length; mi++) { if (missing[mi] === refName) { alreadyListed = true; break; } }
                if (!alreadyListed) missing.push(refName);
            }
        }
        return missing;
    }

    // ═══════════════════════════════════════════════════════════
    // APPLY EXPRESSION
    // ctrlMode: "layer" | "null"
    // ═══════════════════════════════════════════════════════════
    function applyExpressionToProps(code, controllers, targetLayers, ctrlMode, nullName) {
        var applied = 0;
        ctrlMode = ctrlMode || "layer";

        for (var li = 0; li < targetLayers.length; li++) {
            var layer = targetLayers[li];
            var comp  = layer.containingComp;
            var props = getSelectedProps(layer);
            if (props.length === 0) continue;

            if (controllers && controllers.length > 0 && ctrlMode !== "skip") {
                var ctrlTarget = layer;
                if (ctrlMode === "null") {
                    ctrlTarget = comp.layers.addNull();
                    ctrlTarget.name  = (nullName && nullName !== "") ? nullName : layer.name + " \u2014 CTRL";
                    ctrlTarget.label = 2;
                    var topIndex = targetLayers[0].index;
                    for (var tli = 1; tli < targetLayers.length; tli++) {
                        if (targetLayers[tli].index < topIndex) topIndex = targetLayers[tli].index;
                    }
                    try { ctrlTarget.moveBefore(comp.layer(topIndex + 1)); } catch(_) {}
                }

                for (var ci = 0; ci < controllers.length; ci++) {
                    var ctrl = controllers[ci];
                    var fxExists = false;
                    try {
                        for (var fi = 1; fi <= ctrlTarget.Effects.numProperties; fi++) {
                            if (ctrlTarget.Effects.property(fi).name === ctrl.name) { fxExists = true; break; }
                        }
                    } catch(_) {}
                    if (!fxExists) {
                        try {
                            var fx = null;
                            if (ctrl.type === "slider") {
                                fx = ctrlTarget.Effects.addProperty("ADBE Slider Control");
                                fx.name = ctrl.name;
                                fx.property("Slider").setValue(typeof ctrl.defaultVal === "number" ? ctrl.defaultVal : 0);
                            } else if (ctrl.type === "angle") {
                                fx = ctrlTarget.Effects.addProperty("ADBE Angle Control");
                                fx.name = ctrl.name;
                                fx.property("Angle").setValue(typeof ctrl.defaultVal === "number" ? ctrl.defaultVal : 0);
                            } else if (ctrl.type === "checkbox") {
                                fx = ctrlTarget.Effects.addProperty("ADBE Checkbox Control");
                                fx.name = ctrl.name;
                                fx.property("Checkbox").setValue(ctrl.defaultVal ? 1 : 0);
                            } else if (ctrl.type === "color") {
                                fx = ctrlTarget.Effects.addProperty("ADBE Color Control");
                                fx.name = ctrl.name;
                            } else if (ctrl.type === "dropdown menu") {
                                fx = ctrlTarget.Effects.addProperty("ADBE Dropdown Control");
                                fx.name = ctrl.name;
                                if (ctrl.options && ctrl.options.length > 0) {
                                    try { fx.property("Menu").setPropertyParameters(ctrl.options); } catch(_) {}
                                }
                            } else if (ctrl.type === "layer") {
                                fx = ctrlTarget.Effects.addProperty("ADBE Layer Control");
                                fx.name = ctrl.name;
                            } else if (ctrl.type === "point") {
                                fx = ctrlTarget.Effects.addProperty("ADBE Point Control");
                                fx.name = ctrl.name;
                                try { fx.property("Point").setValue([ctrl.defaultX || 0, ctrl.defaultY || 0]); } catch(_) {}
                            } else if (ctrl.type === "3d point") {
                                fx = ctrlTarget.Effects.addProperty("ADBE 3D Point Control");
                                fx.name = ctrl.name;
                                try { fx.property("3D Point").setValue([ctrl.defaultX || 0, ctrl.defaultY || 0, ctrl.defaultZ || 0]); } catch(_) {}
                            }
                        } catch(e) {}
                    }
                }
            }

            for (var pi = 0; pi < props.length; pi++) {
                try { props[pi].expression = ""; props[pi].expression = code; applied++; } catch(_) {}
            }
        }
        return applied;
    }

    // ═══════════════════════════════════════════════════════════
    // POPUP — MANAGE CATEGORIES
    // ═══════════════════════════════════════════════════════════
    function showManageCatsDialog(categories, expressions) {
        var dlg = new Window("dialog", "Manage Categories", undefined, { resizeable: false });
        dlg.orientation = "column"; dlg.alignChildren = ["fill", "top"];
        dlg.spacing = 8; dlg.margins = 16; dlg.preferredSize.width = 320;

        var hdr = dlg.add("statictext", undefined, "MANAGE CATEGORIES");
        hdr.graphics.font = ScriptUI.newFont("dialog", "BOLD", 11);
        dlg.add("statictext", undefined, "Add, rename, or remove categories.\nRenaming updates all assigned expressions.", { multiline: true });
        separator(dlg);

        dlg.add("statictext", undefined, "Existing categories:");
        var catList = dlg.add("listbox", undefined, categories.slice());
        catList.preferredSize = [-1, 120];

        var renameRow = dlg.add("group");
        renameRow.orientation = "row"; renameRow.alignChildren = ["fill", "center"]; renameRow.spacing = 6;
        var renameInput = renameRow.add("edittext", undefined, ""); renameInput.preferredSize.width = 190;
        var renameBtn = renameRow.add("button", undefined, "\u270E  Rename Selected");
        renameBtn.onClick = function() {
            if (!catList.selection) { alert("Select a category to rename."); return; }
            var oldName = catList.selection.text;
            var newName = trim(renameInput.text);
            if (newName === "") { alert("Type a new name first."); return; }
            if (newName === oldName) return;
            for (var i = 0; i < categories.length; i++) {
                if (categories[i] === newName) { alert('"' + newName + '" already exists.'); return; }
            }
            categories[catList.selection.index] = newName;
            for (var i = 0; i < expressions.length; i++) {
                if (expressions[i].category === oldName) expressions[i].category = newName;
            }
            catList.items[catList.selection.index].text = newName;
            renameInput.text = "";
        };
        separator(dlg);

        dlg.add("statictext", undefined, "Add a new category:");
        var addRow = dlg.add("group");
        addRow.orientation = "row"; addRow.alignChildren = ["fill", "center"]; addRow.spacing = 6;
        var addInput = addRow.add("edittext", undefined, ""); addInput.preferredSize.width = 190;
        var addBtn = addRow.add("button", undefined, "+  Add");
        addBtn.onClick = function() {
            var n = trim(addInput.text);
            if (n === "") { alert("Enter a category name."); return; }
            for (var i = 0; i < categories.length; i++) {
                if (categories[i] === n) { alert('"' + n + '" already exists.'); return; }
            }
            categories.push(n); catList.add("item", n); addInput.text = "";
        };
        separator(dlg);

        var deleteBtn = dlg.add("button", undefined, "\u2715  Delete Selected Category");
        deleteBtn.onClick = function() {
            if (!catList.selection) { alert("Select a category to delete."); return; }
            var name = catList.selection.text; var count = 0;
            for (var i = 0; i < expressions.length; i++) if (expressions[i].category === name) count++;
            var msg = 'Delete "' + name + '"?';
            if (count > 0) msg += "\n\n" + count + " expression(s) will become Uncategorized.";
            if (!confirm(msg)) return;
            categories.splice(catList.selection.index, 1); catList.remove(catList.selection);
            for (var i = 0; i < expressions.length; i++) {
                if (expressions[i].category === name) expressions[i].category = "Uncategorized";
            }
            var hasUncat = false;
            for (var i = 0; i < categories.length; i++) if (categories[i] === "Uncategorized") { hasUncat = true; break; }
            if (count > 0 && !hasUncat) { categories.push("Uncategorized"); catList.add("item", "Uncategorized"); }
        };
        separator(dlg);
        dlg.add("button", undefined, "Done").onClick = function() { dlg.close(1); };
        dlg.center(); dlg.show();
        return true;
    }

    // ═══════════════════════════════════════════════════════════
    // POPUP — SAVE / EDIT EXPRESSION
    // ═══════════════════════════════════════════════════════════
    function showSaveDialog(categories, expressions, prefill) {
        var dlg = new Window("dialog", prefill ? "Edit Expression" : "Save New Expression", undefined, { resizeable: true });
        dlg.orientation = "column"; dlg.alignChildren = ["fill", "top"];
        dlg.spacing = 8; dlg.margins = 16; dlg.preferredSize.width = 430;

        var hdr = dlg.add("statictext", undefined, prefill ? "EDIT EXPRESSION" : "SAVE NEW EXPRESSION");
        hdr.graphics.font = ScriptUI.newFont("dialog", "BOLD", 11);
        separator(dlg);

        dlg.add("statictext", undefined, "Name  *");
        var nameInput = dlg.add("edittext", undefined, prefill ? prefill.name : "");
        nameInput.preferredSize = [-1, 22]; nameInput.active = true;

        dlg.add("statictext", undefined, "Category  *");
        var catDrop = dlg.add("dropdownlist", undefined, categories.slice());
        catDrop.preferredSize = [-1, 22];
        var preselCat = prefill ? prefill.category : categories[0];
        for (var i = 0; i < catDrop.items.length; i++) {
            if (catDrop.items[i].text === preselCat) { catDrop.selection = i; break; }
        }
        if (catDrop.selection === null && catDrop.items.length > 0) catDrop.selection = 0;

        dlg.add("statictext", undefined, "Description  (shown on hover)");
        var descInput = dlg.add("edittext", undefined, prefill ? prefill.description : "");
        descInput.preferredSize = [-1, 22];
        separator(dlg);

        var codeHeaderRow = dlg.add("group");
        codeHeaderRow.orientation = "row"; codeHeaderRow.alignChildren = ["fill", "center"];
        codeHeaderRow.add("statictext", undefined, "Expression Code  *");
        var captureInlineBtn = codeHeaderRow.add("button", undefined, "\u2B07 Capture from AE");
        captureInlineBtn.preferredSize = [-1, 20];

        var codeInput = dlg.add("edittext", undefined, prefill ? prefill.code : "", { multiline: true, scrolling: true });
        codeInput.preferredSize = [-1, 90];

        captureInlineBtn.onClick = function() {
            try {
                var comp = app.project.activeItem;
                if (!(comp instanceof CompItem)) { alert("Open a comp and select a property with an expression."); return; }
                var found = null;
                outer: for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    for (var j = 1; j <= layer.numProperties; j++) {
                        var pg = layer.property(j);
                        if (pg.numProperties) {
                            for (var k = 1; k <= pg.numProperties; k++) {
                                var p = pg.property(k);
                                if (p.selected && p.canSetExpression && p.expressionEnabled && p.expression !== "") {
                                    found = p.expression; break outer;
                                }
                            }
                        }
                    }
                }
                if (!found) { alert("No active expression found on selected property."); return; }
                codeInput.text = found;
            } catch(e) { alert("Error: " + e); }
        };

        separator(dlg);

        // ── Controllers ──────────────────────────────────────────────────
        var ctrlHdrRow = dlg.add("group");
        ctrlHdrRow.orientation = "row"; ctrlHdrRow.alignChildren = ["fill", "center"]; ctrlHdrRow.spacing = 6;
        var ctrlHdrLbl = ctrlHdrRow.add("statictext", undefined, "Controllers  (optional)");
        ctrlHdrLbl.graphics.font = ScriptUI.newFont("dialog", "BOLD", 10);
        var copyCtrlFromLayerBtn = ctrlHdrRow.add("button", undefined, "\u21A9 Copy from Layer");
        copyCtrlFromLayerBtn.preferredSize = [-1, 20];

        dlg.add("statictext", undefined,
            "Effect Controls added to the target layer when applying.\n" +
            "Reference in your code as:  effect(\"NAME\")(\"Slider\")  etc.",
            { multiline: true });

        var ctrlList = dlg.add("listbox", undefined, [], {
            multiselect: false, numberOfColumns: 3, showHeaders: true,
            columnTitles: ["Name", "Type", "Details"]
        });
        ctrlList.preferredSize = [-1, 75];

        var controllers = (prefill && prefill.controllers) ? prefill.controllers.slice() : [];

        function refreshCtrlList() {
            ctrlList.removeAll();
            for (var i = 0; i < controllers.length; i++) {
                var c = controllers[i];
                var item = ctrlList.add("item", c.name);
                item.subItems[0].text = c.type;
                if (c.type === "slider") {
                    item.subItems[1].text = c.min + " / " + c.defaultVal + " / " + c.max;
                } else if (c.type === "angle") {
                    item.subItems[1].text = "default: " + c.defaultVal + "\u00B0";
                } else if (c.type === "checkbox") {
                    item.subItems[1].text = "default: " + (c.defaultVal ? "on" : "off");
                } else if (c.type === "dropdown menu") {
                    item.subItems[1].text = (c.options && c.options.length > 0) ? c.options.join(", ") : "(no options)";
                } else if (c.type === "point") {
                    item.subItems[1].text = "[" + c.defaultX + ", " + c.defaultY + "]";
                } else if (c.type === "3d point") {
                    item.subItems[1].text = "[" + c.defaultX + ", " + c.defaultY + ", " + c.defaultZ + "]";
                } else {
                    item.subItems[1].text = "";
                }
            }
        }
        refreshCtrlList();

        // ── Copy controllers from selected AE layer ───────────────────
        copyCtrlFromLayerBtn.onClick = function() {
            try {
                var comp = app.project.activeItem;
                if (!(comp instanceof CompItem)) { alert("Open a comp and select a layer."); return; }
                // Collect all selected layers that have effects
                var candidates = [];
                for (var li = 1; li <= comp.numLayers; li++) {
                    var lyr = comp.layer(li);
                    if (!lyr.selected) continue;
                    try {
                        if (lyr.Effects.numProperties > 0) candidates.push(lyr);
                    } catch(_) {}
                }
                if (candidates.length === 0) { alert("Select a layer with Effect Controls in the timeline."); return; }

                var sourceLayer = candidates[0];

                // If multiple candidates exist, ask which one to use
                if (candidates.length > 1) {
                    var pickDlg = new Window("dialog", "Choose Source Layer", undefined);
                    pickDlg.orientation = "column"; pickDlg.alignChildren = ["fill", "top"];
                    pickDlg.spacing = 8; pickDlg.margins = 16; pickDlg.preferredSize.width = 280;
                    pickDlg.add("statictext", undefined, "Multiple layers selected. Which one has the controllers?");
                    var layerDrop = pickDlg.add("dropdownlist", undefined, []);
                    for (var ci = 0; ci < candidates.length; ci++) layerDrop.add("item", candidates[ci].name);
                    layerDrop.selection = 0;
                    var pickBtnRow = pickDlg.add("group"); pickBtnRow.orientation = "row"; pickBtnRow.alignChildren = ["right", "center"]; pickBtnRow.spacing = 8;
                    pickBtnRow.add("button", undefined, "Cancel").onClick = function() { pickDlg.close(0); };
                    pickBtnRow.add("button", undefined, "OK").onClick = function() { pickDlg.close(1); };
                    if (pickDlg.show() !== 1) return;
                    sourceLayer = candidates[layerDrop.selection.index];
                }

                // Read effects from the source layer
                var imported = [];
                var dupeNames = {};
                for (var fi = 1; fi <= sourceLayer.Effects.numProperties; fi++) {
                    var fx = sourceLayer.Effects.property(fi);
                    var fxName = fx.name;
                    // Check if a controller with this name already exists
                    var existsAlready = false;
                    for (var xi = 0; xi < controllers.length; xi++) {
                        if (controllers[xi].name === fxName) { existsAlready = true; break; }
                    }
                    if (existsAlready) { dupeNames[fxName] = true; continue; }
                    // Map matchName to our type string
                    var mn = fx.matchName;
                    var ctype = null;
                    if (mn === "ADBE Slider Control")   ctype = "slider";
                    else if (mn === "ADBE Angle Control")    ctype = "angle";
                    else if (mn === "ADBE Checkbox Control") ctype = "checkbox";
                    else if (mn === "ADBE Color Control")    ctype = "color";
                    else if (mn === "ADBE Dropdown Control") ctype = "dropdown menu";
                    else if (mn === "ADBE Layer Control")    ctype = "layer";
                    else if (mn === "ADBE Point Control")    ctype = "point";
                    else if (mn === "ADBE 3D Point Control") ctype = "3d point";
                    if (!ctype) continue; // unknown effect type — skip
                    var entry = { name: fxName, type: ctype };
                    if (ctype === "slider") {
                        try { entry.defaultVal = fx.property("Slider").value; } catch(_) { entry.defaultVal = 0; }
                        entry.min = 0; entry.max = 100;
                    } else if (ctype === "angle") {
                        try { entry.defaultVal = fx.property("Angle").value; } catch(_) { entry.defaultVal = 0; }
                    } else if (ctype === "checkbox") {
                        try { entry.defaultVal = (fx.property("Checkbox").value === 1); } catch(_) { entry.defaultVal = false; }
                    } else if (ctype === "point") {
                        try { var v = fx.property("Point").value; entry.defaultX = v[0]; entry.defaultY = v[1]; } catch(_) { entry.defaultX = 0; entry.defaultY = 0; }
                    } else if (ctype === "3d point") {
                        try { var v = fx.property("3D Point").value; entry.defaultX = v[0]; entry.defaultY = v[1]; entry.defaultZ = v[2]; } catch(_) { entry.defaultX = 0; entry.defaultY = 0; entry.defaultZ = 0; }
                    } else {
                        entry.defaultVal = 0;
                    }
                    imported.push(entry);
                }

                if (imported.length === 0 && Object.keys ? Object.keys(dupeNames).length > 0 : false) {
                    alert("All controllers on that layer already exist in the list."); return;
                }
                if (imported.length === 0) { alert("No recognised expression controls found on that layer."); return; }

                for (var ii = 0; ii < imported.length; ii++) controllers.push(imported[ii]);
                refreshCtrlList();

                var dupeList = [];
                for (var dn in dupeNames) { if (dupeNames.hasOwnProperty(dn)) dupeList.push(dn); }
                var msg = "Imported " + imported.length + " controller(s).";
                if (dupeList.length > 0) msg += "\nSkipped " + dupeList.length + " duplicate(s): " + dupeList.join(", ");
                alert(msg);
            } catch(e) { alert("Error: " + e); }
        };

        var addCtrlPanel = dlg.add("panel", undefined, "Add Controller");
        addCtrlPanel.orientation = "column"; addCtrlPanel.alignChildren = ["fill", "top"];
        addCtrlPanel.margins = [8, 14, 8, 8]; addCtrlPanel.spacing = 6;

        var acRow1 = addCtrlPanel.add("group");
        acRow1.orientation = "row"; acRow1.alignChildren = ["fill", "center"]; acRow1.spacing = 6;
        acRow1.add("statictext", undefined, "Name:");
        var ctrlNameInput = acRow1.add("edittext", undefined, ""); ctrlNameInput.preferredSize.width = 120;
        acRow1.add("statictext", undefined, "Type:");
        var ctrlTypeDrop = acRow1.add("dropdownlist", undefined, ["slider", "angle", "checkbox", "color", "dropdown menu", "layer", "point", "3d point"]);
        ctrlTypeDrop.selection = 0; ctrlTypeDrop.preferredSize.width = 100;

        var dynFields = addCtrlPanel.add("group");
        dynFields.orientation = "column"; dynFields.alignChildren = ["fill", "top"]; dynFields.spacing = 6;

        var ctrlSliderDef, ctrlMinIn, ctrlMaxIn, ctrlAngleDef, chkOff, chkOn, ctrlDropOptions, ctrlPointX, ctrlPointY, ctrl3DX, ctrl3DY, ctrl3DZ;

        function buildFields(t) {
            while (dynFields.children.length > 0) dynFields.remove(dynFields.children[0]);

            if (t === "slider") {
                var r = dynFields.add("group"); r.orientation = "row"; r.alignChildren = ["fill", "center"]; r.spacing = 6;
                r.add("statictext", undefined, "Min:");
                ctrlMinIn     = r.add("edittext", undefined, "0");   ctrlMinIn.preferredSize.width = 52;
                r.add("statictext", undefined, "Default:");
                ctrlSliderDef = r.add("edittext", undefined, "0");   ctrlSliderDef.preferredSize.width = 52;
                r.add("statictext", undefined, "Max:");
                ctrlMaxIn     = r.add("edittext", undefined, "100"); ctrlMaxIn.preferredSize.width = 52;
            } else if (t === "angle") {
                var r = dynFields.add("group"); r.orientation = "row"; r.alignChildren = ["fill", "center"]; r.spacing = 6;
                r.add("statictext", undefined, "Default (\u00B0):");
                ctrlAngleDef = r.add("edittext", undefined, "0"); ctrlAngleDef.preferredSize.width = 60;
            } else if (t === "checkbox") {
                var r = dynFields.add("group"); r.orientation = "row"; r.alignChildren = ["left", "center"]; r.spacing = 12;
                r.add("statictext", undefined, "Default:");
                chkOff = r.add("radiobutton", undefined, "Off");
                chkOn  = r.add("radiobutton", undefined, "On");
                chkOff.value = true;
            } else if (t === "dropdown menu") {
                var r = dynFields.add("group"); r.orientation = "column"; r.alignChildren = ["fill", "top"]; r.spacing = 4;
                r.add("statictext", undefined, "Options (one per line):");
                ctrlDropOptions = r.add("edittext", undefined, "Option 1\nOption 2\nOption 3", { multiline: true, scrolling: true });
                ctrlDropOptions.preferredSize = [-1, 52];
            } else if (t === "point") {
                var r = dynFields.add("group"); r.orientation = "row"; r.alignChildren = ["fill", "center"]; r.spacing = 6;
                r.add("statictext", undefined, "Default X:");
                ctrlPointX = r.add("edittext", undefined, "0"); ctrlPointX.preferredSize.width = 60;
                r.add("statictext", undefined, "Y:");
                ctrlPointY = r.add("edittext", undefined, "0"); ctrlPointY.preferredSize.width = 60;
            } else if (t === "3d point") {
                var r = dynFields.add("group"); r.orientation = "row"; r.alignChildren = ["fill", "center"]; r.spacing = 6;
                r.add("statictext", undefined, "Default X:");
                ctrl3DX = r.add("edittext", undefined, "0"); ctrl3DX.preferredSize.width = 46;
                r.add("statictext", undefined, "Y:");
                ctrl3DY = r.add("edittext", undefined, "0"); ctrl3DY.preferredSize.width = 46;
                r.add("statictext", undefined, "Z:");
                ctrl3DZ = r.add("edittext", undefined, "0"); ctrl3DZ.preferredSize.width = 46;
            }

            var btnRow = dynFields.add("group"); btnRow.orientation = "row"; btnRow.alignChildren = ["right", "center"]; btnRow.spacing = 6;
            var removeCtrlBtn = btnRow.add("button", undefined, "\u2715  Remove Selected");
            var addCtrlBtn    = btnRow.add("button", undefined, "+  Add Controller");

            addCtrlBtn.onClick = function() {
                var cname = trim(ctrlNameInput.text);
                if (cname === "") { alert("Enter a controller name."); return; }
                var ctype = ctrlTypeDrop.selection.text;
                var entry = { name: cname, type: ctype };
                if (ctype === "slider") {
                    entry.min        = (trim(ctrlMinIn.text) !== "")     ? parseFloat(trim(ctrlMinIn.text))     : 0;
                    entry.defaultVal = (trim(ctrlSliderDef.text) !== "") ? parseFloat(trim(ctrlSliderDef.text)) : 0;
                    entry.max        = (trim(ctrlMaxIn.text) !== "")     ? parseFloat(trim(ctrlMaxIn.text))     : 100;
                } else if (ctype === "angle") {
                    entry.defaultVal = (trim(ctrlAngleDef.text) !== "") ? parseFloat(trim(ctrlAngleDef.text)) : 0;
                } else if (ctype === "checkbox") {
                    entry.defaultVal = chkOn.value;
                } else if (ctype === "dropdown menu") {
                    var lines = ctrlDropOptions.text.split("\n"); var opts = [];
                    for (var oi = 0; oi < lines.length; oi++) { var opt = trim(lines[oi]); if (opt !== "") opts.push(opt); }
                    if (opts.length === 0) { alert("Add at least one option."); return; }
                    entry.options = opts;
                } else if (ctype === "point") {
                    entry.defaultX = (trim(ctrlPointX.text) !== "") ? parseFloat(trim(ctrlPointX.text)) : 0;
                    entry.defaultY = (trim(ctrlPointY.text) !== "") ? parseFloat(trim(ctrlPointY.text)) : 0;
                } else if (ctype === "3d point") {
                    entry.defaultX = (trim(ctrl3DX.text) !== "") ? parseFloat(trim(ctrl3DX.text)) : 0;
                    entry.defaultY = (trim(ctrl3DY.text) !== "") ? parseFloat(trim(ctrl3DY.text)) : 0;
                    entry.defaultZ = (trim(ctrl3DZ.text) !== "") ? parseFloat(trim(ctrl3DZ.text)) : 0;
                }
                controllers.push(entry); refreshCtrlList(); ctrlNameInput.text = "";
            };
            removeCtrlBtn.onClick = function() {
                if (!ctrlList.selection) { alert("Select a controller to remove."); return; }
                controllers.splice(ctrlList.selection.index, 1); refreshCtrlList();
            };
            try { addCtrlPanel.layout.layout(true); dlg.layout.layout(true); dlg.layout.resize(); } catch(_) {}
        }

        ctrlTypeDrop.onChange = function() { buildFields(ctrlTypeDrop.selection.text); };
        dlg.onShow = function() { buildFields(ctrlTypeDrop.selection.text); };

        separator(dlg);

        var btnRow = dlg.add("group");
        btnRow.orientation = "row"; btnRow.alignChildren = ["right", "center"]; btnRow.spacing = 8;
        btnRow.add("button", undefined, "Cancel").onClick = function() { dlg.close(0); };
        var saveBtn = btnRow.add("button", undefined, "\u2713  Save");

        var result = null;
        saveBtn.onClick = function() {
            var name = trim(nameInput.text), code = trim(codeInput.text);
            if (name === "" || code === "") { alert("Name and Code are required."); return; }
            var cat  = catDrop.selection ? catDrop.selection.text : (categories[0] || "Custom");
            var desc = trim(descInput.text);

            // Warn if code references effect names with no matching controller
            var missing = getMissingControllerRefs(code, controllers);
            if (missing.length > 0) {
                var warnMsg = "Warning: your code references these effect names that have no matching controller defined:\n\n  \u2022 " + missing.join("\n  \u2022 ") + "\n\nSave anyway?";
                if (!confirm(warnMsg)) return;
            }

            result = { name: name, category: cat, code: code, description: desc,
                       favourite: (prefill ? !!prefill.favourite : false),
                       controllers: controllers };
            dlg.close(1);
        };

        dlg.center(); dlg.show();
        return result;
    }

    // ═══════════════════════════════════════════════════════════
    // POPUP — SELECTIVE EXPORT
    // ═══════════════════════════════════════════════════════════
    function showExportDialog(exprs, cats) {
        var dlg = new Window("dialog", "Export Expressions", undefined, { resizeable: false });
        dlg.orientation = "column"; dlg.alignChildren = ["fill", "top"];
        dlg.spacing = 8; dlg.margins = 16; dlg.preferredSize.width = 380;

        var hdr = dlg.add("statictext", undefined, "SELECTIVE EXPORT");
        hdr.graphics.font = ScriptUI.newFont("dialog", "BOLD", 11);
        dlg.add("statictext", undefined, "Select the expressions to export, then choose a save location.", { multiline: true });
        separator(dlg);

        var selRow = dlg.add("group");
        selRow.orientation = "row"; selRow.alignChildren = ["left", "center"]; selRow.spacing = 8;
        var selAllBtn  = selRow.add("button", undefined, "Select All");             selAllBtn.preferredSize  = [-1, 20];
        var selNoneBtn = selRow.add("button", undefined, "Select None");            selNoneBtn.preferredSize = [-1, 20];
        var selFavsBtn = selRow.add("button", undefined, "\u2605 Favourites Only"); selFavsBtn.preferredSize = [-1, 20];

        dlg.add("statictext", undefined, "Expressions to export:");
        var exprListBox = dlg.add("listbox", undefined, [], {
            multiselect: true, numberOfColumns: 2, showHeaders: true, columnTitles: ["Name", "Category"]
        });
        exprListBox.preferredSize = [-1, 180];
        for (var i = 0; i < exprs.length; i++) {
            var item = exprListBox.add("item", (exprs[i].favourite ? "\u2605 " : "") + exprs[i].name);
            item.subItems[0].text = exprs[i].category; item.selected = true;
        }
        selAllBtn.onClick  = function() { for (var i = 0; i < exprListBox.items.length; i++) exprListBox.items[i].selected = true; };
        selNoneBtn.onClick = function() { for (var i = 0; i < exprListBox.items.length; i++) exprListBox.items[i].selected = false; };
        selFavsBtn.onClick = function() { for (var i = 0; i < exprListBox.items.length; i++) exprListBox.items[i].selected = !!exprs[i].favourite; };

        separator(dlg);
        dlg.add("statictext", undefined, "Save to:");
        var pathRow = dlg.add("group");
        pathRow.orientation = "row"; pathRow.alignChildren = ["fill", "center"]; pathRow.spacing = 6;
        var pathInput = pathRow.add("edittext", undefined, Folder.myDocuments.absoluteURI + "/expressions_export.json");
        pathInput.alignment = ["fill", "center"];
        var browseBtn = pathRow.add("button", undefined, "Browse..."); browseBtn.preferredSize = [-1, 22];
        browseBtn.onClick = function() { var f = File.saveDialog("Save as...", "JSON:*.json"); if (f) pathInput.text = f.absoluteURI; };

        separator(dlg);
        var btnRow = dlg.add("group"); btnRow.orientation = "row"; btnRow.alignChildren = ["right", "center"]; btnRow.spacing = 8;
        btnRow.add("button", undefined, "Cancel").onClick = function() { dlg.close(0); };
        btnRow.add("button", undefined, "\u2191  Export Selected").onClick = function() {
            var selected = [], selectedCats = {};
            for (var i = 0; i < exprListBox.items.length; i++) {
                if (exprListBox.items[i].selected) { selected.push(exprs[i]); selectedCats[exprs[i].category] = true; }
            }
            if (selected.length === 0) { alert("Select at least one expression to export."); return; }
            var exportCats = [];
            for (var ci = 0; ci < cats.length; ci++) { if (selectedCats[cats[ci]]) exportCats.push(cats[ci]); }
            var path = trim(pathInput.text);
            if (path === "") { alert("Choose a file path first."); return; }
            try {
                var f = File(path);
                f.open("w"); f.writeln(JSON.stringify({ exprs: selected, cats: exportCats })); f.close();
                alert("Exported " + selected.length + " expression(s) to:\n" + path);
                dlg.close(1);
            } catch(e) { alert("Export failed:\n" + e); }
        };
        dlg.center(); dlg.show();
    }

    // ═══════════════════════════════════════════════════════════
    // POPUP — CONTROLLER PLACEMENT
    // Returns { mode, nullName } or null if cancelled.
    // lastPrefs is used to pre-select the last-used mode.
    // ═══════════════════════════════════════════════════════════
    function showCtrlPlacementDialog(exprName, lastPrefs) {
        var dlg = new Window("dialog", "Controller Placement", undefined, { resizeable: false });
        dlg.orientation = "column"; dlg.alignChildren = ["fill", "top"];
        dlg.spacing = 10; dlg.margins = 16; dlg.preferredSize.width = 300;

        var hdr = dlg.add("statictext", undefined, "CONTROLLER PLACEMENT");
        hdr.graphics.font = ScriptUI.newFont("dialog", "BOLD", 11);
        dlg.add("statictext", undefined,
            "\"" + exprName + "\" has controllers.\nWhere should the Effect Controls be added?",
            { multiline: true });

        var rdoSkip    = dlg.add("radiobutton", undefined, "Don't create controllers");
        var rdoOnLayer = dlg.add("radiobutton", undefined, "Add to the target layer(s)");
        var rdoNewNull = dlg.add("radiobutton", undefined, "Add to a new null layer above");

        // Pre-select from last-used preference
        if (lastPrefs && lastPrefs.ctrlMode === "null")  rdoNewNull.value = true;
        else if (lastPrefs && lastPrefs.ctrlMode === "skip") rdoSkip.value = true;
        else rdoOnLayer.value = true;

        var nameRow = dlg.add("group");
        nameRow.orientation = "row"; nameRow.alignChildren = ["left", "center"]; nameRow.spacing = 8;
        nameRow.add("statictext", undefined, "Null name:");
        var nameInput = nameRow.add("edittext", undefined, exprName + " \u2014 CTRL");
        nameInput.preferredSize.width = 160;
        nameRow.enabled = (rdoNewNull.value);

        rdoOnLayer.onClick = function() { nameRow.enabled = false; };
        rdoNewNull.onClick = function() { nameRow.enabled = true; nameInput.active = true; };
        rdoSkip.onClick    = function() { nameRow.enabled = false; };

        var btnRow = dlg.add("group"); btnRow.orientation = "row"; btnRow.alignChildren = ["right", "center"]; btnRow.spacing = 8;
        btnRow.add("button", undefined, "Cancel").onClick = function() { dlg.close(0); };
        btnRow.add("button", undefined, "\u25B6  Apply").onClick = function() { dlg.close(1); };

        var picked = null;
        if (dlg.show() === 1) {
            var nullName = trim(nameInput.text);
            if (nullName === "") nullName = exprName + " \u2014 CTRL";
            var mode = rdoNewNull.value ? "null" : rdoSkip.value ? "skip" : "layer";
            picked = { mode: mode, nullName: nullName };
        }
        return picked;
    }

    // ═══════════════════════════════════════════════════════════
    // POPUP — ABOUT
    // ═══════════════════════════════════════════════════════════
    function showAboutDialog() {
        var dlg = new Window("dialog", "About Stash EX", undefined, { resizeable: false });
        dlg.orientation = "column"; dlg.alignChildren = ["fill", "top"];
        dlg.spacing = 10; dlg.margins = 20; dlg.preferredSize.width = 320;

        // Logo / title block
        var titleLbl = dlg.add("statictext", undefined, "Stash EX - Your After Effectsexpression library");
        titleLbl.graphics.font = ScriptUI.newFont("dialog", "BOLD", 18);
        titleLbl.alignment = ["center", "top"];

        var vLbl = dlg.add("statictext", undefined, "Version 1.0");
        vLbl.alignment = ["center", "top"];

        separator(dlg);

        // Info fields — fill these in
        var fields = [
            { label: "Made by",   value: "Daan Noordermeer" },
            { label: "Support",   value: "stashex@gmail.com" },
            { label: "License",   value: "Single user license" }
        ];

        for (var fi = 0; fi < fields.length; fi++) {
            var row = dlg.add("group");
            row.orientation = "row"; row.alignChildren = ["left", "center"]; row.spacing = 0;
            var lbl = row.add("statictext", undefined, fields[fi].label + ":  ");
            lbl.graphics.font = ScriptUI.newFont("dialog", "BOLD", 10);
            lbl.preferredSize.width = 70;
            var val = row.add("statictext", undefined, fields[fi].value);
            val.graphics.font = ScriptUI.newFont("dialog", "REGULAR", 10);
        }

        separator(dlg);

        // Short description — edit as needed
        var descLbl = dlg.add("statictext", undefined,
            "Stash EX lets you save, organise, and apply\n" +
            "After Effects expressions with their Effect\n" +
            "Controls — all from one dockable panel.",
            { multiline: true });
        descLbl.alignment = ["center", "top"];
        descLbl.graphics.font = ScriptUI.newFont("dialog", "REGULAR", 10);

        separator(dlg);

        var closeBtn = dlg.add("button", undefined, "Close");
        closeBtn.alignment = ["center", "top"];
        closeBtn.onClick = function() { dlg.close(); };

        dlg.center(); dlg.show();
    }

    // ═══════════════════════════════════════════════════════════
    // MAIN PANEL
    // ═══════════════════════════════════════════════════════════
    function buildUI(container) {
        var d     = loadData();
        var exprs = d.exprs;
        var cats  = d.cats;
        var prefs = loadPrefs(); // { ctrlMode: "layer"|"null" }

        var activeCat     = "All";
        var selIdx        = -1;
        var showFavsOnly  = false;
        var exprClipboard = null;

        var panel = (container instanceof Panel)
            ? container
            : new Window("palette", "Stash EX", undefined, { resizeable: true });
        panel.orientation = "column"; panel.alignChildren = ["fill", "top"];
        panel.spacing = 0; panel.margins = 0;

        var tipGroup = panel.add("group"); tipGroup.orientation = "row"; tipGroup.margins = [0,0,0,0];
        var tipBar = tipGroup.add("statictext", undefined, "");
        tipBar.preferredSize = [0, 0];
        tipBar.graphics.font = ScriptUI.newFont("dialog", "ITALIC", 10);

        // ── EXPRESSIONS GROUP ─────────────────────────────────
        var expressionsGroup = panel.add("panel", undefined, "");
        expressionsGroup.orientation = "column"; expressionsGroup.alignChildren = ["fill", "top"];
        expressionsGroup.margins = [8, 14, 8, 8]; expressionsGroup.spacing = 6;

        // Two rows, label fixed width so controls align like the rest of the panel
        var searchGroup = expressionsGroup.add("group");
        searchGroup.orientation = "row"; searchGroup.alignChildren = ["fill", "center"]; searchGroup.spacing = 6;
        var searchLbl = searchGroup.add("statictext", undefined, "Search:");
        searchLbl.preferredSize.width = 55;
        var searchInput = searchGroup.add("edittext", undefined, ""); searchInput.alignment = ["fill", "center"];
        tip(searchInput, "Filter by name or category", tipBar);
        var clearBtn = searchGroup.add("button", undefined, "\u2715"); clearBtn.preferredSize = [22, 22];
        tip(clearBtn, "Clear search", tipBar);
        clearBtn.onClick = function() { searchInput.text = ""; onSearch(); };
        searchInput.onChanging = function() { onSearch(); };

        var controlRow = expressionsGroup.add("group");
        controlRow.orientation = "row"; controlRow.alignChildren = ["fill", "center"]; controlRow.spacing = 6;
        var catLbl = controlRow.add("statictext", undefined, "Category:");
        catLbl.preferredSize.width = 55;
        var catDropFilter = controlRow.add("dropdownlist", undefined, ["All"]); catDropFilter.alignment = ["fill", "center"];
        tip(catDropFilter, "Filter expressions by category", tipBar);
        var favFilterBtn = controlRow.add("button", undefined, "\u2606"); favFilterBtn.preferredSize = [28, 22];
        tip(favFilterBtn, "Toggle: show favourites only", tipBar);
        var manageCatsBtn = controlRow.add("button", undefined, "\u2630  Categories");
        manageCatsBtn.alignment = ["right", "center"];
        tip(manageCatsBtn, "Add, rename, or delete categories", tipBar);

        function rebuildTabs() {
            var prev = catDropFilter.selection ? catDropFilter.selection.text : "All";
            catDropFilter.removeAll(); catDropFilter.add("item", "All");
            for (var i = 0; i < cats.length; i++) catDropFilter.add("item", cats[i]);
            var restored = false;
            for (var j = 0; j < catDropFilter.items.length; j++) {
                if (catDropFilter.items[j].text === prev) { catDropFilter.selection = j; restored = true; break; }
            }
            if (!restored) catDropFilter.selection = 0;
        }
        catDropFilter.onChange = function() {
            activeCat = catDropFilter.selection ? catDropFilter.selection.text : "All";
            selIdx = -1; refresh(); updateDetail();
        };
        rebuildTabs();

        favFilterBtn.onClick = function() {
            showFavsOnly = !showFavsOnly;
            favFilterBtn.text = showFavsOnly ? "\u2605" : "\u2606";
            selIdx = -1; refresh(); updateDetail();
        };

        var exprList = expressionsGroup.add("listbox", undefined, [], {
            multiselect: false, numberOfColumns: 3, showHeaders: true,
            columnTitles: ["\u2605", "Name", "Category"],
            columnAlignment: ["center", "left", "right"]
        });
        exprList.preferredSize = [-1, 130];
        tip(exprList, "Select an expression — double-click to apply immediately", tipBar);

        var filteredExprs = [];

        function getFiltered() {
            var q = searchInput.text.toLowerCase(); var out = [];
            for (var i = 0; i < exprs.length; i++) {
                var e = exprs[i];
                if (showFavsOnly && !e.favourite) continue;
                if ((activeCat === "All" || e.category === activeCat) &&
                    (q === "" || e.name.toLowerCase().indexOf(q) !== -1 || e.category.toLowerCase().indexOf(q) !== -1))
                    out.push(e);
            }
            out.sort(function(a, b) {
                if (a.favourite && !b.favourite) return -1;
                if (!a.favourite && b.favourite) return 1;
                return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
            });
            return out;
        }

        function refresh() {
            filteredExprs = getFiltered(); exprList.removeAll();
            for (var i = 0; i < filteredExprs.length; i++) {
                var item = exprList.add("item", filteredExprs[i].favourite ? "\u2605" : "");
                item.subItems[0].text = filteredExprs[i].name;
                item.subItems[1].text = filteredExprs[i].category;
            }
            if (selIdx >= 0 && selIdx < filteredExprs.length) exprList.selection = selIdx;
        }

        function onSearch() { selIdx = -1; refresh(); updateDetail(); }
        refresh();

        exprList.onChange = function() {
            selIdx = exprList.selection ? exprList.selection.index : -1;
            updateDetail();
        };

        // ── DETAILS GROUP ─────────────────────────────────────
        function getFreshExpr(name) {
            for (var i = 0; i < exprs.length; i++) { if (exprs[i].name === name) return exprs[i]; }
            return null;
        }

        var detailGroup = panel.add("panel", undefined, "");
        detailGroup.orientation = "column"; detailGroup.alignChildren = ["fill", "top"];
        detailGroup.margins = [8, 14, 8, 8]; detailGroup.spacing = 4;

        var descLbl = detailGroup.add("statictext", undefined, "Select an expression to preview it.", { multiline: true });
        descLbl.preferredSize = [-1, 30];
        var codeLbl = detailGroup.add("statictext", undefined, "Code:");
        codeLbl.graphics.font = ScriptUI.newFont("dialog", "BOLD", 10);
        var codePreview = detailGroup.add("edittext", undefined, "", { multiline: true, scrolling: true, readonly: true });
        codePreview.preferredSize = [-1, 65];
        tip(codePreview, "Read-only — use Copy Code to grab this", tipBar);

        function updateDetail() {
            if (selIdx >= 0 && selIdx < filteredExprs.length) {
                var e = getFreshExpr(filteredExprs[selIdx].name);
                if (!e) { descLbl.text = "Select an expression to preview it."; codePreview.text = ""; return; }
                descLbl.text = (e.favourite ? "\u2605  " : "") + (e.description || "(no description)");
                if (e.controllers && e.controllers.length > 0)
                    descLbl.text += "  [" + e.controllers.length + " controller(s)]";
                codePreview.text = e.code;
            } else {
                descLbl.text = "Select an expression to preview it."; codePreview.text = "";
            }
        }

        // ── ACTIONS ────────────────────────
        var actionsGroup = panel.add("panel", undefined, "");
        actionsGroup.orientation = "column"; actionsGroup.alignChildren = ["fill", "top"];
        actionsGroup.margins = [8, 14, 8, 8]; actionsGroup.spacing = 6;

        var actionRow1 = actionsGroup.add("group");
        actionRow1.orientation = "row"; actionRow1.alignChildren = ["fill", "center"]; actionRow1.spacing = 6;
        var applyBtn    = actionRow1.add("button", undefined, "\u25B6  Apply");     applyBtn.alignment    = ["fill", "center"];
        var copyCodeBtn = actionRow1.add("button", undefined, "\u29C5  Copy Code"); copyCodeBtn.alignment = ["fill", "center"];

        var actionRow2 = actionsGroup.add("group");
        actionRow2.orientation = "row"; actionRow2.alignChildren = ["fill", "center"]; actionRow2.spacing = 6;
        var editBtn   = actionRow2.add("button", undefined, "\u270E  Edit");      editBtn.alignment   = ["fill", "center"];
        var dupBtn    = actionRow2.add("button", undefined, "\u29C9  Duplicate"); dupBtn.alignment    = ["fill", "center"];
        var favBtn    = actionRow2.add("button", undefined, "\u2605  Favourite");  favBtn.alignment    = ["fill", "center"];
        var deleteBtn = actionRow2.add("button", undefined, "\u2715  Delete");    deleteBtn.alignment = ["fill", "center"];

        // ── Copy Paste ────────────────────────
        var copyPasteGroup = panel.add("panel", undefined, "");
        copyPasteGroup.orientation = "column"; copyPasteGroup.alignChildren = ["fill", "top"];
        copyPasteGroup.margins = [8, 14, 8, 8]; copyPasteGroup.spacing = 6;

        var cpRow = copyPasteGroup.add("group");
        cpRow.orientation = "row"; cpRow.alignChildren = ["fill", "center"]; cpRow.spacing = 6;
        var cpyPropBtn   = cpRow.add("button", undefined, "\u2398  Copy from Prop"); cpyPropBtn.alignment   = ["fill", "center"];
        var pastePropBtn = cpRow.add("button", undefined, "\u2399  Paste to Props"); pastePropBtn.alignment = ["fill", "center"];

        var clipStatusLbl = copyPasteGroup.add("statictext", undefined, "Clipboard: empty");
        clipStatusLbl.preferredSize = [-1, 14];
        clipStatusLbl.graphics.font = ScriptUI.newFont("dialog", "ITALIC", 10);

        tip(applyBtn,    "Apply selected expression to selected layer properties",    tipBar);
        tip(copyCodeBtn, "Show code in preview box for manual copy",                  tipBar);
        tip(editBtn,     "Edit this expression and its controllers",                  tipBar);
        tip(dupBtn,      "Duplicate this expression as a starting point for a new one", tipBar);
        tip(favBtn,      "Toggle favourite — favourites sort to the top of the list", tipBar);
        tip(deleteBtn,   "Permanently delete this expression",                        tipBar);
        tip(cpyPropBtn,   "Copy expression from a selected AE property to clipboard",   tipBar);
        tip(pastePropBtn, "Paste clipboard expression onto all selected AE properties",  tipBar);

        function updateClipStatus() {
            if (exprClipboard) {
                var preview = exprClipboard.code.length > 44 ? exprClipboard.code.substring(0, 44) + "..." : exprClipboard.code;
                clipStatusLbl.text = "Clipboard: " + preview.replace(/\n/g, " ");
            } else { clipStatusLbl.text = "Clipboard: empty"; }
        }

        // ── CREATE / IMPORT / EXPORT GROUP ────────────────────
        var createGroup = panel.add("panel", undefined, "");
        createGroup.orientation = "column"; createGroup.alignChildren = ["fill", "top"];
        createGroup.margins = [8, 14, 8, 8]; createGroup.spacing = 6;

        var addNewBtn = createGroup.add("button", undefined, "+  New Expression"); addNewBtn.alignment = ["fill", "center"];
        tip(addNewBtn, "Open the Save dialog to create a new expression with optional controllers", tipBar);

        var ioRow = createGroup.add("group");
        ioRow.orientation = "row"; ioRow.alignChildren = ["fill", "center"]; ioRow.spacing = 6;
        var exportBtn = ioRow.add("button", undefined, "\u2191  Export"); exportBtn.alignment = ["fill", "center"];
        var importBtn = ioRow.add("button", undefined, "\u2193  Import"); importBtn.alignment = ["fill", "center"];
        tip(exportBtn, "Selectively export expressions to a JSON file", tipBar);
        tip(importBtn, "Import expressions from a JSON file (merges with library)", tipBar);

        // ── FOOTER ────────────────────────────────────────────
        var footerGroup = panel.add("group");
        footerGroup.orientation = "row"; footerGroup.alignChildren = ["fill", "center"];
        footerGroup.margins = [8, 4, 8, 6]; footerGroup.spacing = 4;

        var versionLbl = footerGroup.add("statictext", undefined, "Stash EX  v1.0");
        versionLbl.graphics.font = ScriptUI.newFont("dialog", "ITALIC", 9);
        versionLbl.alignment = ["left", "center"];

        var infoBtn = footerGroup.add("button", undefined, "\u2139  Info");
        infoBtn.preferredSize = [-1, 18]; infoBtn.alignment = ["right", "center"];
        tip(infoBtn, "About Stash EX", tipBar);

        // ═══════════════════════════════════════════════════════
        // HELPERS
        // ═══════════════════════════════════════════════════════
        function afterCatChange() {
            persist(exprs, cats); rebuildTabs();
            activeCat = catDropFilter.selection ? catDropFilter.selection.text : "All";
            refresh(); updateDetail();
            if (panel.layout) { panel.layout.layout(true); panel.layout.resize(); }
        }

        // Core apply logic — shared by applyBtn and double-click
        function doApply(expr, skipPlacementDialog) {
            var ctrlMode = "layer";
            var nullName = null;
            if (expr.controllers && expr.controllers.length > 0) {
                if (skipPlacementDialog) {
                    // Double-click: use last saved preference, no dialog
                    ctrlMode = prefs.ctrlMode || "layer";
                } else {
                    var picked = showCtrlPlacementDialog(expr.name, prefs);
                    if (picked === null) return;
                    ctrlMode  = picked.mode;
                    nullName  = picked.nullName;
                    // Remember this choice
                    prefs.ctrlMode = ctrlMode;
                    savePrefs(prefs);
                }
            }

            app.beginUndoGroup("Apply Expression: " + expr.name);
            try {
                var comp = app.project.activeItem;
                if (!(comp instanceof CompItem)) { alert("Open a comp and select a layer property."); app.endUndoGroup(); return; }
                var targetLayers = [];
                for (var i = 1; i <= comp.numLayers; i++) { if (comp.layer(i).selected) targetLayers.push(comp.layer(i)); }
                if (targetLayers.length === 0) { alert("Select a layer and property in the timeline first."); app.endUndoGroup(); return; }
                var applied = applyExpressionToProps(expr.code, expr.controllers, targetLayers, ctrlMode, nullName);
                if (applied > 0) {
                    var msg = "Applied to " + applied + " propert" + (applied === 1 ? "y" : "ies") + ".";
                    if (expr.controllers && expr.controllers.length > 0) {
                        if (ctrlMode === "null")       msg += "\nControllers added to a new null layer.";
                        else if (ctrlMode === "layer") msg += "\nControllers added to the target layer.";
                        // skip: no controller message
                    }
                    alert(msg);
                } else {
                    alert("No expression-compatible properties selected.\nSelect a property (e.g. Position) in the timeline.");
                }
            } catch(e) { alert("Error: " + e); }
            app.endUndoGroup();
        }

        // ═══════════════════════════════════════════════════════
        // BUTTON LOGIC
        // ═══════════════════════════════════════════════════════
        manageCatsBtn.onClick = function() { showManageCatsDialog(cats, exprs); afterCatChange(); };

        addNewBtn.onClick = function() {
            var result = showSaveDialog(cats, exprs, null);
            if (!result) return;
            for (var i = 0; i < exprs.length; i++) {
                if (exprs[i].name === result.name) {
                    if (!confirm('"' + result.name + '" already exists. Overwrite?')) return;
                    exprs.splice(i, 1); break;
                }
            }
            exprs.push(result); persist(exprs, cats); selIdx = -1; refresh(); updateDetail();
        };

        editBtn.onClick = function() {
            if (selIdx < 0 || selIdx >= filteredExprs.length) { alert("Select an expression to edit."); return; }
            var originalName = filteredExprs[selIdx].name;
            var original = getFreshExpr(originalName);
            if (!original) { alert("Expression not found."); return; }
            var result = showSaveDialog(cats, exprs, original);
            if (!result) return;
            for (var i = 0; i < exprs.length; i++) {
                if (exprs[i].name === originalName) { exprs.splice(i, 1); break; }
            }
            exprs.push(result); persist(exprs, cats); selIdx = -1; refresh(); updateDetail();
        };

        dupBtn.onClick = function() {
            if (selIdx < 0 || selIdx >= filteredExprs.length) { alert("Select an expression to duplicate."); return; }
            var original = getFreshExpr(filteredExprs[selIdx].name);
            if (!original) { alert("Expression not found."); return; }
            // Deep-copy and open the save dialog pre-filled, with name cleared so user gives it a new one
            var copy = JSON.parse(JSON.stringify(original));
            copy.name = original.name + " copy";
            copy.favourite = false;
            var result = showSaveDialog(cats, exprs, copy);
            if (!result) return;
            // Check for name collision
            for (var i = 0; i < exprs.length; i++) {
                if (exprs[i].name === result.name) {
                    if (!confirm('"' + result.name + '" already exists. Overwrite?')) return;
                    exprs.splice(i, 1); break;
                }
            }
            exprs.push(result); persist(exprs, cats); selIdx = -1; refresh(); updateDetail();
        };

        favBtn.onClick = function() {
            if (selIdx < 0 || selIdx >= filteredExprs.length) { alert("Select an expression first."); return; }
            var name = filteredExprs[selIdx].name;
            for (var i = 0; i < exprs.length; i++) {
                if (exprs[i].name === name) {
                    exprs[i].favourite = !exprs[i].favourite;
                    persist(exprs, cats); selIdx = -1; refresh(); updateDetail(); return;
                }
            }
        };

        applyBtn.onClick = function() {
            if (selIdx < 0 || selIdx >= filteredExprs.length) { alert("Select an expression first."); return; }
            var expr = getFreshExpr(filteredExprs[selIdx].name);
            if (!expr) { alert("Expression not found."); return; }
            doApply(expr, false); // false = show placement dialog
        };

        // Double-click on list = instant apply, skips placement dialog
        exprList.onDoubleClick = function() {
            if (!exprList.selection) return;
            selIdx = exprList.selection.index;
            var expr = getFreshExpr(filteredExprs[selIdx].name);
            if (!expr) return;
            doApply(expr, true); // true = skip dialog, use last pref
        };

        copyCodeBtn.onClick = function() {
            if (selIdx < 0 || selIdx >= filteredExprs.length) { alert("Select an expression first."); return; }
            var e = getFreshExpr(filteredExprs[selIdx].name);
            if (e) { codePreview.text = e.code; codePreview.active = true; alert("Code shown in the preview box.\nPress Ctrl/Cmd+A then Ctrl/Cmd+C to copy."); }
        };

        deleteBtn.onClick = function() {
            if (selIdx < 0 || selIdx >= filteredExprs.length) { alert("Select an expression first."); return; }
            var name = filteredExprs[selIdx].name;
            if (!confirm('Delete "' + name + '"?')) return;
            for (var i = 0; i < exprs.length; i++) { if (exprs[i].name === name) { exprs.splice(i, 1); break; } }
            persist(exprs, cats); selIdx = -1; refresh(); updateDetail();
        };

        cpyPropBtn.onClick = function() {
            try {
                var comp = app.project.activeItem;
                if (!(comp instanceof CompItem)) { alert("Open a composition first."); return; }
                var found = null, foundName = "";
                outer: for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i);
                    var props = getSelectedProps(layer);
                    for (var p = 0; p < props.length; p++) {
                        if (props[p].expressionEnabled && props[p].expression !== "") {
                            found = props[p].expression; foundName = props[p].name; break outer;
                        }
                    }
                }
                if (!found) { alert("No active expression found on a selected property."); return; }
                exprClipboard = { code: found, sourcePropName: foundName }; updateClipStatus();
            } catch(e) { alert("Error: " + e); }
        };

        pastePropBtn.onClick = function() {
            if (!exprClipboard) { alert("Clipboard is empty. Use Copy from Prop first."); return; }
            app.beginUndoGroup("Paste Expression");
            try {
                var comp = app.project.activeItem;
                if (!(comp instanceof CompItem)) { alert("Open a composition first."); app.endUndoGroup(); return; }
                var applied = 0;
                for (var i = 1; i <= comp.numLayers; i++) {
                    var layer = comp.layer(i); if (!layer.selected) continue;
                    var props = getSelectedProps(layer);
                    for (var p = 0; p < props.length; p++) {
                        try { props[p].expression = ""; props[p].expression = exprClipboard.code; applied++; } catch(_) {}
                    }
                }
                if (applied > 0) alert("Pasted to " + applied + " propert" + (applied === 1 ? "y" : "ies") + ".");
                else alert("No expression-compatible properties selected.\nSelect properties in the timeline first.");
            } catch(e) { alert("Error: " + e); }
            app.endUndoGroup();
        };

        exportBtn.onClick = function() { showExportDialog(exprs, cats); };

        infoBtn.onClick = function() { showAboutDialog(); };

        importBtn.onClick = function() {
            try {
                var f = File.openDialog("Select an expression library JSON file", "JSON:*.json");
                if (!f) return;
                f.open("r"); var raw = f.readln(); f.close();
                if (!raw || raw.length === 0) { alert("File is empty."); return; }
                var parsed = JSON.parse(raw);
                if (!parsed.exprs || !(parsed.exprs instanceof Array)) { alert("Invalid file — no expressions array found."); return; }

                // Collect conflicts and new entries
                var toAdd = [], conflicts = [];
                for (var i = 0; i < parsed.exprs.length; i++) {
                    var incoming = parsed.exprs[i];
                    if (!incoming.name || !incoming.code) continue;
                    if (!incoming.controllers) incoming.controllers = [];
                    var existsIdx = -1;
                    for (var j = 0; j < exprs.length; j++) { if (exprs[j].name === incoming.name) { existsIdx = j; break; } }
                    if (existsIdx >= 0) conflicts.push({ incoming: incoming, existsIdx: existsIdx });
                    else toAdd.push(incoming);
                }

                // Handle conflicts with per-expression merge dialog
                var overwritten = 0, skipped = 0;
                if (conflicts.length > 0) {
                    var mDlg = new Window("dialog", "Resolve Conflicts", undefined);
                    mDlg.orientation = "column"; mDlg.alignChildren = ["fill", "top"];
                    mDlg.spacing = 8; mDlg.margins = 16; mDlg.preferredSize.width = 360;
                    var mHdr = mDlg.add("statictext", undefined, "IMPORT CONFLICTS");
                    mHdr.graphics.font = ScriptUI.newFont("dialog", "BOLD", 11);
                    mDlg.add("statictext", undefined,
                        conflicts.length + " expression(s) already exist. Choose what to do with each:", { multiline: true });
                    separator(mDlg);

                    // Per-conflict dropdowns
                    var choices = [];
                    for (var ci = 0; ci < conflicts.length; ci++) {
                        var cRow = mDlg.add("group");
                        cRow.orientation = "row"; cRow.alignChildren = ["fill", "center"]; cRow.spacing = 8;
                        var cLbl = cRow.add("statictext", undefined, conflicts[ci].incoming.name);
                        cLbl.preferredSize.width = 160;
                        var cDrop = cRow.add("dropdownlist", undefined, ["Skip", "Overwrite"]);
                        cDrop.selection = 0; cDrop.preferredSize.width = 90;
                        choices.push(cDrop);
                    }
                    separator(mDlg);
                    var mBtnRow = mDlg.add("group"); mBtnRow.orientation = "row"; mBtnRow.alignChildren = ["right", "center"]; mBtnRow.spacing = 8;
                    mBtnRow.add("button", undefined, "Cancel").onClick = function() { mDlg.close(0); };
                    mBtnRow.add("button", undefined, "Apply").onClick = function() { mDlg.close(1); };

                    if (mDlg.show() !== 1) return;

                    for (var ci = 0; ci < conflicts.length; ci++) {
                        if (choices[ci].selection && choices[ci].selection.text === "Overwrite") {
                            exprs[conflicts[ci].existsIdx] = conflicts[ci].incoming;
                            overwritten++;
                        } else { skipped++; }
                    }
                }

                for (var ai = 0; ai < toAdd.length; ai++) exprs.push(toAdd[ai]);

                // Merge categories
                if (parsed.cats instanceof Array) {
                    for (var i = 0; i < parsed.cats.length; i++) {
                        var ce = false;
                        for (var j = 0; j < cats.length; j++) { if (cats[j] === parsed.cats[i]) { ce = true; break; } }
                        if (!ce) cats.push(parsed.cats[i]);
                    }
                }
                persist(exprs, cats); rebuildTabs(); refresh(); updateDetail();

                var summary = "Imported " + toAdd.length + " new expression(s).";
                if (overwritten > 0) summary += "\nOverwrote " + overwritten + " expression(s).";
                if (skipped > 0)     summary += "\nSkipped " + skipped + " expression(s).";
                alert(summary);
            } catch(e) { alert("Import failed:\n" + e); }
        };

        // ═══════════════════════════════════════════════════════
        // LAYOUT & SHOW
        // ═══════════════════════════════════════════════════════
        if (panel instanceof Window) {
            panel.preferredSize.width = 340; panel.center();
            panel.layout.layout(true); panel.layout.resize();
            panel.show();
        } else {
            panel.layout.layout(true); panel.layout.resize();
            panel.onResizing = panel.onResize = function() { panel.layout.resize(); };
        }
        return panel;
    }

    buildUI(thisObj);

}(this));