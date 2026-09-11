// Gravity Well — input.js
// Pointer-event gesture recognizer for the planning canvas: tap, double-tap and
// well dragging. Pointer Events only (no touch/mouse events), single active
// pointer (extras ignored), pointercancel safe.

import { killRadius } from './sim.js';
import { screenToWorld } from './render.js';

export var DRAG_THRESHOLD_PX = 8;   // movement before a press becomes a drag
export var DOUBLE_TAP_MS = 300;     // max gap between the two taps
export var DOUBLE_TAP_PX = 20;      // max distance between the two taps
export var TAP_MAX_MS = 600;        // a press held longer is not a tap
export var HIT_PAD_WORLD = 18;      // thumb-friendly padding around killRadius

// opts: {
//   getView() -> view, getWells() -> [{x,y,charges}], enabled() -> bool,
//   onTap(wx,wy,index), onDoubleTap(wx,wy,index),
//   onDragStart(index,wx,wy), onDragMove(index,wx,wy), onDragEnd(index,wx,wy)
// }
export function createInput(canvas, opts) {
  var o = opts || {};
  var noop = function () {};
  var onTap = o.onTap || noop;
  var onDoubleTap = o.onDoubleTap || noop;
  var onDragStart = o.onDragStart || noop;
  var onDragMove = o.onDragMove || noop;
  var onDragEnd = o.onDragEnd || noop;

  var activeId = null;
  var startX = 0, startY = 0, startT = 0;
  var dragging = false;
  var dragIndex = -1;
  var lastTap = null; // {x, y, time}

  function enabled() { return o.enabled ? !!o.enabled() : true; }

  function localPos(e) {
    var rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function toWorld(p) {
    var view = o.getView && o.getView();
    if (!view) return { x: 0, y: 0 };
    return screenToWorld(view, p.x, p.y);
  }

  // Nearest well whose generous hit disc contains the world point, else -1.
  function hitTest(wx, wy) {
    var wells = (o.getWells && o.getWells()) || [];
    var best = -1, bestD = Infinity;
    for (var i = 0; i < wells.length; i++) {
      var w = wells[i];
      var dx = wx - w.x, dy = wy - w.y;
      var d = Math.sqrt(dx * dx + dy * dy);
      var rr = killRadius(w.charges) + HIT_PAD_WORLD;
      if (d <= rr && d < bestD) { bestD = d; best = i; }
    }
    return best;
  }

  function onPointerDown(e) {
    if (e.isPrimary === false) return;
    if (activeId !== null) return; // ignore extra pointers
    if (!enabled()) return;
    e.preventDefault();
    activeId = e.pointerId;
    var p = localPos(e);
    startX = p.x; startY = p.y; startT = now();
    dragging = false;
    var w = toWorld(p);
    dragIndex = hitTest(w.x, w.y);
    if (canvas.setPointerCapture) {
      try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
  }

  function onPointerMove(e) {
    if (activeId === null || e.pointerId !== activeId) return;
    e.preventDefault();
    var p = localPos(e);
    var dx = p.x - startX, dy = p.y - startY;
    if (!dragging && dragIndex >= 0 && (dx * dx + dy * dy) > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX) {
      dragging = true;
      lastTap = null; // a drag cancels any pending double-tap
      var w0 = toWorld(p);
      onDragStart(dragIndex, w0.x, w0.y);
    }
    if (dragging) {
      var w = toWorld(p);
      onDragMove(dragIndex, w.x, w.y);
    }
  }

  function finish(e, cancelled) {
    if (activeId === null || e.pointerId !== activeId) return;
    if (e.preventDefault) e.preventDefault();
    if (canvas.releasePointerCapture) {
      try { canvas.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
    }
    var p = localPos(e);
    var wasDragging = dragging;
    var idx = dragIndex;
    activeId = null;
    dragging = false;
    dragIndex = -1;

    if (cancelled) { if (wasDragging) onDragEnd(idx, toWorld(p).x, toWorld(p).y); return; }

    if (wasDragging) {
      var wd = toWorld(p);
      onDragEnd(idx, wd.x, wd.y);
      return;
    }

    var dx = p.x - startX, dy = p.y - startY;
    var dt = now() - startT;
    if ((dx * dx + dy * dy) > DRAG_THRESHOLD_PX * DRAG_THRESHOLD_PX || dt > TAP_MAX_MS) return;

    var t = now();
    var isDouble = !!lastTap &&
      (t - lastTap.time) <= DOUBLE_TAP_MS &&
      Math.abs(p.x - lastTap.x) <= DOUBLE_TAP_PX &&
      Math.abs(p.y - lastTap.y) <= DOUBLE_TAP_PX;

    var w = toWorld(p);
    if (isDouble) {
      lastTap = null;
      onDoubleTap(w.x, w.y, hitTest(w.x, w.y));
    } else {
      lastTap = { x: p.x, y: p.y, time: t };
      onTap(w.x, w.y, hitTest(w.x, w.y));
    }
  }

  function onPointerUp(e) { finish(e, false); }
  function onPointerCancel(e) { finish(e, true); }

  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerCancel);
  // Suppress the synthetic context menu / callout on long press.
  canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });

  return {
    reset: function () { activeId = null; dragging = false; dragIndex = -1; lastTap = null; },
    destroy: function () {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerCancel);
    }
  };
}

function now() {
  return (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
}
