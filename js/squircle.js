/**
 * squircle.js — iOS-style continuous-curvature corners
 *
 * Standard border-radius uses a circular arc that abruptly meets the
 * straight edge (you can see the "kink"). iOS squircle uses a superellipse
 * (n ≈ 5) where curvature is continuous — no transition point.
 *
 * The trick: for a circle the Bézier handle is at 0.5523 × radius.
 * For a squircle the handle is at ~0.90 × radius, so the curve stays
 * nearly straight until it's very close to the corner, then bends sharply.
 *
 * Usage:
 *   applySquircle(element, radiusPx)
 *   applySquircle(element, radiusPx, { hover: true }) // also transitions on hover
 */

(function () {
  'use strict';

  var HANDLE = 0.9; // squircle bezier handle factor (0.5523 = circle, ~0.9 = squircle)

  function buildPath(w, h, r) {
    var radius = Math.min(r, w / 2, h / 2);
    var c = radius * HANDLE;
    var W = w, H = h, R = radius;
    return (
      'M ' + R + ',0 ' +
      'H ' + (W - R) + ' ' +
      'C ' + (W - R + c) + ',0 ' + W + ',' + (R - c) + ' ' + W + ',' + R + ' ' +
      'V ' + (H - R) + ' ' +
      'C ' + W + ',' + (H - R + c) + ' ' + (W - R + c) + ',' + H + ' ' + (W - R) + ',' + H + ' ' +
      'H ' + R + ' ' +
      'C ' + (R - c) + ',' + H + ' 0,' + (H - R + c) + ' 0,' + (H - R) + ' ' +
      'V ' + R + ' ' +
      'C 0,' + (R - c) + ' ' + (R - c) + ',0 ' + R + ',0 Z'
    );
  }

  function applySquircle(el, radius) {
    radius = radius || 24;

    function update() {
      var w = el.offsetWidth;
      var h = el.offsetHeight;
      if (w > 0 && h > 0) {
        el.style.clipPath = "path('" + buildPath(w, h, radius) + "')";
      }
    }

    if (window.ResizeObserver) {
      new ResizeObserver(update).observe(el);
    }
    // Also fire immediately in case element already has dimensions
    update();
  }

  window.applySquircle = applySquircle;
}());
