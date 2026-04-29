(function (thisObj) {

    function buildUI(thisObj) {
        var panel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Color Swapper", undefined, { resizeable: true });
        panel.orientation = "column";
        panel.alignChildren = ["fill", "top"];
        panel.spacing = 10;
        panel.margins = 16;

        // --- DROPDOWN SELECTION ---
        var dropdownGroup = panel.add("group");
        dropdownGroup.orientation = "column";
        dropdownGroup.alignChildren = ["fill", "center"];
        dropdownGroup.alignment = ["fill", "top"];
        dropdownGroup.spacing = 5;

        var ddScope = dropdownGroup.add("dropdownlist", undefined, ["Project", "Comp", "Selected Layers"]);
        ddScope.selection = 1; 
        ddScope.alignment = ["fill", "top"];

        var ddTarget = dropdownGroup.add("dropdownlist", undefined, ["Only Fills", "Only Strokes", "Fills & Strokes"]);
        ddTarget.selection = 2; 
        ddTarget.alignment = ["fill", "top"];

        // --- COLORS GROUP ---
        var colorPanel = panel.add("panel", undefined, "Colors");
        colorPanel.orientation = "row"; 
        // Centering alignment here ensures the fixed-width content stays in the middle as the panel grows
        colorPanel.alignChildren = ["center", "center"]; 
        colorPanel.alignment = ["fill", "top"];
        colorPanel.margins = [10, 15, 10, 10];
        colorPanel.spacing = 15; // Space between the picker column and the UI swap button

        // Left side: The two rows
        var pickerColumn = colorPanel.add("group");
        pickerColumn.orientation = "column";
        pickerColumn.alignChildren = ["left", "center"];
        pickerColumn.spacing = 5;

        var rowA = addColorPickerRow(pickerColumn, "Pick A...", [1, 1, 1, 1]);
        var rowB = addColorPickerRow(pickerColumn, "Pick B...", [0, 0, 0, 1]);

        // Right side: The UI Swap Icon Button (FIXED SQUARE)
        var uiSwapBtn = colorPanel.add("button", undefined, "⇅");
        uiSwapBtn.preferredSize = [30, 30];
        uiSwapBtn.maximumSize = [30, 30]; 
        uiSwapBtn.helpTip = "Swap UI Colors";

        // --- ACTION BUTTONS (BOTTOM) ---
        var btnGroup = panel.add("group");
        btnGroup.orientation = "row";
        btnGroup.alignChildren = ["fill", "center"];
        btnGroup.alignment = ["fill", "top"];
        btnGroup.spacing = 10;

        var btnSwap = btnGroup.add("button", undefined, "Swap");
        btnSwap.alignment = ["fill", "top"];

        var btnReplace = btnGroup.add("button", undefined, "Replace");
        btnReplace.alignment = ["fill", "top"];

        // --- LOGIC ---

        uiSwapBtn.onClick = function() {
            var valA = rowA.getStoredColor();
            var valB = rowB.getStoredColor();
            rowA.updateUI(valB);
            rowB.updateUI(valA);
        };

        function runColorLogic(isSwapMode) {
            app.beginUndoGroup(isSwapMode ? "Color Swap" : "Color Replace");
            
            var scope = ddScope.selection.text;
            var targetType = ddTarget.selection.text;
            var colorA = rowA.getStoredColor();
            var colorB = rowB.getStoredColor();

            var layersToProcess = [];

            if (scope === "Selected Layers") {
                if (app.project.activeItem instanceof CompItem) {
                    layersToProcess = app.project.activeItem.selectedLayers;
                }
            } else if (scope === "Comp") {
                var comp = app.project.activeItem;
                if (comp instanceof CompItem) {
                    for (var i = 1; i <= comp.numLayers; i++) layersToProcess.push(comp.layer(i));
                }
            } else if (scope === "Project") {
                for (var j = 1; j <= app.project.numItems; j++) {
                    var item = app.project.item(j);
                    if (item instanceof CompItem) {
                        for (var k = 1; k <= item.numLayers; k++) layersToProcess.push(item.layer(k));
                    }
                }
            }

            for (var l = 0; l < layersToProcess.length; l++) {
                processRecursive(layersToProcess[l], colorA, colorB, targetType, isSwapMode);
            }

            app.endUndoGroup();
            app.activate();
        }

        btnReplace.onClick = function() { runColorLogic(false); };
        btnSwap.onClick = function() { runColorLogic(true); };

        panel.onResizing = panel.onResize = function() {
            this.layout.resize();
        };

        panel.layout.layout(true);
        return panel;
    }

    function addColorPickerRow(parent, label, defaultColor) {
        var storedColor = defaultColor;
        var dispColor = [storedColor[0], storedColor[1], storedColor[2], 1];
        
        var group = parent.add("group");
        group.orientation = "row";
        group.alignChildren = ["left", "center"];
        group.spacing = 8;

        // FIXED SQUARE SWATCH
        var swatch = group.add("customButton", undefined);
        swatch.preferredSize = [25, 25];
        swatch.maximumSize = [25, 25]; 
        
        swatch.onDraw = function() {
            var g = this.graphics;
            g.newPath();
            g.rectPath(0, 0, this.size.width, this.size.height);
            g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, dispColor));
        };

        // FIXED WIDTH PICK BUTTON
        var btn = group.add("button", undefined, label);
        btn.preferredSize = [100, 25];
        btn.maximumSize = [100, 25]; 

        var rowObj = {
            getStoredColor: function() { return storedColor; },
            updateUI: function(val) {
                storedColor = val;
                dispColor = [val[0], val[1], val[2], 1];
                swatch.notify("onDraw");
            }
        };

        btn.onClick = function () { 
            var result = GoodBoyNinjaColorPicker(storedColor);
            if (result) { rowObj.updateUI(result); }
        };
        return rowObj;
    }

    function processRecursive(container, colA, colB, targetType, isSwapMode) {
        if (!container.numProperties) return;
        for (var i = 1; i <= container.numProperties; i++) {
            var prop = container.property(i);
            if (prop.propertyType === PropertyType.PROPERTY) {
                if (prop.propertyValueType === PropertyValueType.COLOR) {
                    var isFill = (prop.parentProperty.name.toLowerCase().indexOf("fill") !== -1);
                    var isStroke = (prop.parentProperty.name.toLowerCase().indexOf("stroke") !== -1);
                    var matchTarget = (targetType === "Both") || 
                                     (targetType === "Only Fills" && isFill) || 
                                     (targetType === "Only Strokes" && isStroke);

                    if (matchTarget) {
                        if (colorsMatch(prop.value, colA)) {
                            prop.setValue(colB);
                        } else if (isSwapMode && colorsMatch(prop.value, colB)) {
                            prop.setValue(colA);
                        }
                    }
                }
            } else {
                processRecursive(prop, colA, colB, targetType, isSwapMode);
            }
        }
    }

    function colorsMatch(c1, c2) {
        for (var i = 0; i < 3; i++) {
            if (Math.abs(c1[i] - c2[i]) > 0.015) return false;
        }
        return true;
    }

    function GoodBoyNinjaColorPicker(startValue){
        var crntComp = app.project.activeItem;
        if (!crntComp || !(crntComp instanceof CompItem)) {
            alert("Please open a comp first"); return null;
        }
        var newNull = crntComp.layers.addNull();
        var ctrl = newNull("ADBE Effect Parade").addProperty("ADBE Color Control")("ADBE Color Control-0001");
        if (startValue) { ctrl.setValue(startValue); }
        ctrl.selected = true;
        app.executeCommand(2240); 
        var result = ctrl.value;
        newNull.remove();
        return result;
    }

    var myScriptPal = buildUI(thisObj);
    if (myScriptPal instanceof Window) {
        myScriptPal.center();
        myScriptPal.show();
    }
})(this);