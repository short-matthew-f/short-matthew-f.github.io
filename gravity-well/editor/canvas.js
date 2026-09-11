// Gravity Well — editor/canvas.js
//
// The editing surface: a pannable / zoomable camera over the level, hit
// testing, selection handles, the placement tools, the polygon tool and the
// belt brush. Pointer Events only — one finger pans or drags, two fingers
// pinch-zoom and pan, the wheel zooms at the cursor on desktop.
//
// Everything a player sees is drawn with the GAME's renderer (render.js) from a
// real sim state built by sim.js `createState`, so a level looks in the editor
// exactly as it will look in the game: drawBodies() for the movers and rock,
// drawLevelFixtures() for the phase-2 fixtures (zones, waypoints, fixed wells,
// repulsors, a moving target's path), drawShip / drawTarget / drawWells for the
// rest. The only local painters are editor chrome (selection handles, hot-zone
// overlay, ghost trail, tutorial markers, in-progress drafts) plus ONE
// PLACEHOLDER: a polygon obstacle, which render.js and the sim both still treat
// as a circle — see drawPolyObstacle.
//
// The camera is a plain {scale, ox, oy} view object in render.js's own format
// (screenX = worldX * scale + ox), so every render.js helper works unchanged.

import * as Sim from '../sim.js';
import * as R from '../render.js';
import * as T from './tools.js';

var TAP_PX = 8;           // movement below this is still a tap
var TAP_MS = 700;
var HANDLE_R = 7;         // drawn radius, CSS px
var HANDLE_HIT = 18;      // generous thumb target
var MIN_SCALE = 0.08;
var MAX_SCALE = 6;

// Types whose body is a circle with a draggable radius handle.
var RADIUS_TYPES = {
  obstacle: 1, asteroid: 1, drone: 1, hunter: 1, ore: 1, oreReceiver: 1,
  waypoint: 1, deadZone: 1, allowedZone: 1
};

// ---------------------------------------------------------------------------
// Fixture templates (what a palette tap drops on the board)
// ---------------------------------------------------------------------------

/** Build a fixture for `tool` at world (x, y). Ids are unique within a level. */
export function makeFixture(tool, x, y, level) {
  var id = function (base) { return T.uniqueFixtureId(level, base); };
  switch (tool) {
    case 'obstacle-circle':
      return { type: 'obstacle', id: id('rock'), shape: 'circle', x: x, y: y, r: 70 };
    case 'obstacle-rect':
      return { type: 'obstacle', id: id('wall'), shape: 'rect', x: x - 90, y: y - 50, w: 180, h: 100 };
    case 'obstacle-poly':
      return { type: 'obstacle', id: id('ridge'), shape: 'poly', points: [] };
    case 'asteroid':
      return { type: 'asteroid', id: id('rock'), x: x, y: y, r: 34, vx: -80, vy: 0 };
    case 'asteroid-patrol':
      return {
        type: 'asteroid', id: id('sweep'), r: 34, speed: 90, loop: true,
        path: [{ x: x - 160, y: y }, { x: x + 160, y: y }]
      };
    case 'drone':
      return { type: 'drone', id: id('drone'), x: x, y: y, r: 16, vx: 0, vy: 0 };
    case 'hunter':
      return { type: 'hunter', id: id('hunter'), x: x, y: y, r: 16, vx: 0, vy: 0, accel: 60, maxSpeed: 140 };
    case 'ore':
      return { type: 'ore', id: id('ore'), x: x, y: y, r: 12, vx: 0, vy: 0 };
    case 'oreReceiver':
      return { type: 'oreReceiver', id: id('depot'), x: x, y: y, r: 50 };
    case 'wormhole':
      return {
        type: 'wormhole', id: id('hole'), r: 26, oneWay: false, color: 0,
        a: { x: x - 110, y: y, angle: Math.PI }, b: { x: x + 110, y: y, angle: 0 }
      };
    case 'waypoint':
      return { type: 'waypoint', id: id('wp'), x: x, y: y, r: 34, order: nextWaypointOrder(level) };
    case 'well':
      return { type: 'well', id: id('fixed'), x: x, y: y, charges: 1 };
    case 'repulsor':
      return { type: 'repulsor', id: id('push'), x: x, y: y, charges: 1 };
    case 'deadzone-circle':
      return { type: 'deadZone', id: id('dead'), shape: 'circle', x: x, y: y, r: 120 };
    case 'deadzone-rect':
      return { type: 'deadZone', id: id('dead'), shape: 'rect', x: x - 110, y: y - 70, w: 220, h: 140 };
    case 'deadzone-poly':
      return { type: 'deadZone', id: id('dead'), shape: 'poly', points: [] };
    case 'allowed-circle':
      return { type: 'allowedZone', id: id('allow'), shape: 'circle', x: x, y: y, r: 150 };
    case 'allowed-rect':
      return { type: 'allowedZone', id: id('allow'), shape: 'rect', x: x - 140, y: y - 90, w: 280, h: 180 };
    case 'allowed-poly':
      return { type: 'allowedZone', id: id('allow'), shape: 'poly', points: [] };
    default:
      return null;
  }
}

function nextWaypointOrder(level) {
  var n = 0;
  var fixtures = (level && level.fixtures) || [];
  for (var i = 0; i < fixtures.length; i++) {
    if (fixtures[i].type === 'waypoint' && fixtures[i].order > n) n = fixtures[i].order;
  }
  return n + 1;
}

/** Tools that draw a rect by dragging; the rest place on tap. */
function isRectTool(tool) {
  return tool === 'obstacle-rect' || tool === 'deadzone-rect' || tool === 'allowed-rect';
}
function isCircleTool(tool) {
  return tool === 'obstacle-circle' || tool === 'deadzone-circle' || tool === 'allowed-circle';
}
export function isPolyTool(tool) {
  return tool === 'obstacle-poly' || tool === 'deadzone-poly' || tool === 'allowed-poly';
}

// ---------------------------------------------------------------------------
// Polygon obstacle — the one PLACEHOLDER painter
//
// sim.js collides an `obstacle` as a circle or an axis-aligned rect; a polygon
// obstacle therefore falls back to the circle given by its `x, y, r` fields,
// which the polygon tool writes alongside `points`. The editor draws BOTH the
// polygon the designer sees and, dashed, the circle the physics actually uses,
// so the gap is visible rather than a nasty surprise at launch. When sim.js
// and render.js learn polygon obstacles, delete this and let drawBodies() and
// drawLevelFixtures() handle it.
// ---------------------------------------------------------------------------

function isPolyObstacle(f) {
  return f && f.type === 'obstacle' && f.shape === 'poly';
}

// ---------------------------------------------------------------------------
// The editing surface
// ---------------------------------------------------------------------------

export function createEditorCanvas(app, canvasEl) {
  var ctx = canvasEl.getContext('2d');
  var view = { scale: 1, ox: 0, oy: 0, cssW: 1, cssH: 1, area: { x: 0, y: 0, w: 1, h: 1 } };
  var dpr = 1;
  var t0 = Date.now();

  var pointers = {};
  var pointerCount = 0;
  var gesture = null;    // { mode, ... }
  var pinch = null;
  var polyDraft = null;  // { fixture, points:[] }
  var beltDraft = null;  // { points:[] }
  // True once the designer has panned or zoomed: after that the camera is
  // theirs and chrome appearing must not yank it back to the fitted view.
  var camMoved = false;

  // ------------------------------------------------------------- geometry

  // How much of the viewport the chrome covers. The camera fits the board into
  // what is left, so nothing the designer needs to tap ever sits under the top
  // bar, the tool strip or the panel.
  function chromePad() {
    var top = 0, right = 8, bottom = 8, left = 8;
    var topEl = document.getElementById('ed-top');
    if (topEl) top = topEl.getBoundingClientRect().height + 8;
    var strip = document.getElementById('ed-toolstrip');
    if (strip && !strip.hidden) {
      var sr = strip.getBoundingClientRect();
      if (sr.height > 0 && sr.bottom + 8 > top) top = sr.bottom + 8;
    }
    var panel = document.getElementById('ed-panel');
    if (panel) {
      var pr = panel.getBoundingClientRect();
      if (pr.width < window.innerWidth - 20) right = Math.max(0, window.innerWidth - pr.left) + 8;
      else bottom = Math.max(0, window.innerHeight - pr.top) + 8;
    }
    return { top: top, right: right, bottom: bottom, left: left };
  }

  function fit() {
    camMoved = false;
    var lv = app.level();
    var b = (lv && lv.bounds) || { w: 900, h: 1200 };
    var v = R.computeView(view.cssW, view.cssH, b, chromePad());
    view.scale = v.scale;
    view.ox = v.ox;
    view.oy = v.oy;
    view.area = v.area;
    draw();
  }

  function resize() {
    dpr = Math.min(3, window.devicePixelRatio || 1);
    var cssW = canvasEl.clientWidth || window.innerWidth;
    var cssH = canvasEl.clientHeight || window.innerHeight;
    var hadSize = view.cssW > 1;
    var cx = hadSize ? (view.cssW / 2 - view.ox) / view.scale : 0;
    var cy = hadSize ? (view.cssH / 2 - view.oy) / view.scale : 0;
    view.cssW = cssW;
    view.cssH = cssH;
    canvasEl.width = Math.max(1, Math.round(cssW * dpr));
    canvasEl.height = Math.max(1, Math.round(cssH * dpr));
    if (hadSize) {
      view.ox = cssW / 2 - cx * view.scale;
      view.oy = cssH / 2 - cy * view.scale;
      view.area = { x: 0, y: 0, w: cssW, h: cssH };
      draw();
    } else {
      view.area = { x: 0, y: 0, w: cssW, h: cssH };
      fit();
    }
  }

  function toWorld(sx, sy) {
    return { x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale };
  }

  function eventPoint(e) {
    var rect = canvasEl.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  function zoomAt(sx, sy, k) {
    var next = view.scale * k;
    if (next < MIN_SCALE) next = MIN_SCALE;
    if (next > MAX_SCALE) next = MAX_SCALE;
    var f = next / view.scale;
    view.ox = sx - (sx - view.ox) * f;
    view.oy = sy - (sy - view.oy) * f;
    view.scale = next;
    camMoved = true;
    draw();
  }

  // -------------------------------------------------------------- display

  // A real sim state, so bodies carry exactly the fields render.js expects.
  // Polygon obstacles are dropped first: the sim would fall back to their
  // circle, which the editor draws itself (dashed) next to the polygon.
  function displayState(lv) {
    var copy = { };
    for (var k in lv) {
      if (Object.prototype.hasOwnProperty.call(lv, k)) copy[k] = lv[k];
    }
    var keep = [];
    var fixtures = lv.fixtures || [];
    for (var i = 0; i < fixtures.length; i++) if (!isPolyObstacle(fixtures[i])) keep.push(fixtures[i]);
    copy.fixtures = keep;
    try {
      return Sim.createState(copy, []);
    } catch (e) {
      return null;
    }
  }

  function draw() {
    var lv = app.level();
    if (!lv) return;
    var t = (Date.now() - t0) / 1000;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    R.drawBackground(ctx, lv.id || 'editor', view.cssW, view.cssH, dpr);
    R.drawBounds(ctx, view, lv.bounds);

    var fixtures = lv.fixtures || [];
    var i;

    // 1. the hot-zone overlay sits under the level so the level stays readable
    drawHotzone();

    // 2. zones, waypoints, fixed wells, repulsors, a moving target's path —
    //    all straight from the game's renderer, so they read identically.
    R.drawLevelFixtures(ctx, view, lv, t, {
      flight: false,
      killRadiusFn: Sim.killRadius,
      reach: Sim.WELL_REACH,
      waypointsPassed: 0
    });

    // 3. movers and rock, via a real sim state so every body carries the
    //    fields render.js expects. Polygon obstacles are held back (see the
    //    PLACEHOLDER note at the top) and drawn below.
    var st = displayState(lv);
    if (st) R.drawBodies(ctx, view, st.bodies, t, st.ship);
    for (i = 0; i < fixtures.length; i++) {
      if (isPolyObstacle(fixtures[i])) drawPolyObstacle(fixtures[i]);
    }

    // 4. target and ship
    if (lv.target) R.drawTarget(ctx, view, lv.target, t, { dimmed: false });
    if (lv.ship) {
      R.drawShip(ctx, view, {
        x: lv.ship.x, y: lv.ship.y, vx: lv.ship.vx || 0, vy: lv.ship.vy || 0, alive: true
      }, Sim.SHIP_RADIUS, { showVelocity: true });
    }

    // 5. the authored solution
    var wells = app.displayWells();
    if (wells && wells.length) R.drawWells(ctx, view, wells, Sim.killRadius, { dim: true });

    drawOverlays(t);
    drawTutorialMarkers(t);
    drawDrafts();
    drawSelection();
  }

  function drawPolyObstacle(f) {
    var pts = f.points || [];
    if (pts.length < 2) return;
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(R.wx2sx(view, pts[0].x), R.wy2sy(view, pts[0].y));
    for (var i = 1; i < pts.length; i++) ctx.lineTo(R.wx2sx(view, pts[i].x), R.wy2sy(view, pts[i].y));
    ctx.closePath();
    ctx.fillStyle = R.COLORS.obstacle;
    ctx.globalAlpha = 0.85;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = R.COLORS.obstacleEdge;
    ctx.lineWidth = 1.4;
    ctx.stroke();
    // the circle the sim will actually collide against
    if (f.r) {
      ctx.setLineDash([4, 5]);
      ctx.globalAlpha = 0.7;
      ctx.strokeStyle = R.COLORS.bad;
      ctx.beginPath();
      ctx.arc(R.wx2sx(view, f.x), R.wy2sy(view, f.y), Math.max(2, f.r * view.scale), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }

  function drawHotzone() {
    var hz = app.overlay.hotzone;
    if (!hz || !hz.cells) return;
    var step = hz.step * view.scale;
    ctx.save();
    for (var r = 0; r < hz.rows; r++) {
      for (var c = 0; c < hz.cols; c++) {
        var v = hz.cells[r * hz.cols + c];
        if (v !== 1) continue;
        ctx.fillStyle = 'rgba(124,246,176,0.28)';
        ctx.fillRect(
          R.wx2sx(view, c * hz.step), R.wy2sy(view, r * hz.step),
          Math.max(1, step), Math.max(1, step)
        );
      }
    }
    ctx.restore();
  }

  function drawOverlays(t) {
    var ov = app.overlay;
    if (ov.tolerance && ov.tolerance.length) {
      ctx.save();
      for (var i = 0; i < ov.tolerance.length; i++) {
        var d = ov.tolerance[i];
        ctx.beginPath();
        ctx.arc(R.wx2sx(view, d.x), R.wy2sy(view, d.y), Math.max(2, d.r * view.scale), 0, Math.PI * 2);
        ctx.fillStyle = d.ok === false ? 'rgba(255,107,107,0.16)' : 'rgba(79,227,208,0.16)';
        ctx.fill();
        ctx.strokeStyle = d.ok === false ? R.COLORS.bad : '#4fe3d0';
        ctx.globalAlpha = 0.8;
        ctx.lineWidth = 1.2;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
      ctx.restore();
    }
    if (ov.wells && ov.wells.length) {
      R.drawWells(ctx, view, ov.wells, Sim.killRadius, {});
    }
    if (ov.path && ov.path.length > 1) {
      R.drawTrajectory(ctx, view, ov.path, { bright: true, endMark: ov.pathEnd || null });
    }
    if (app.ghost && app.ghost.length > 1) {
      R.drawTrail(ctx, view, app.ghost, 'rgba(79,227,208,0.55)', 2);
    }
  }

  function drawTutorialMarkers(t) {
    if (!app.tutorialPreview) return;
    var lv = app.level();
    var steps = (lv.tutorial && lv.tutorial.steps) || [];
    ctx.save();
    for (var i = 0; i < steps.length; i++) {
      var m = steps[i].marker;
      if (!m || m.kind === 'ui') continue;
      var cx = R.wx2sx(view, m.x || 0);
      var cy = R.wy2sy(view, m.y || 0);
      var pulse = 0.5 + 0.5 * Math.sin(t * 3 + i);
      ctx.strokeStyle = '#ffd479';
      ctx.globalAlpha = 0.5 + 0.4 * pulse;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, (m.kind === 'well' ? Sim.killRadius(m.charges || 1) * view.scale : 10) + 6 + 4 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.9;
      ctx.fillStyle = '#ffd479';
      ctx.font = '700 11px ui-monospace, Menlo, monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(i + 1), cx, cy - 14);
    }
    ctx.restore();
  }

  function drawDrafts() {
    var i;
    if (polyDraft && polyDraft.points.length) {
      ctx.save();
      ctx.strokeStyle = '#4fe3d0';
      ctx.lineWidth = 1.6;
      ctx.setLineDash([6, 5]);
      ctx.beginPath();
      ctx.moveTo(R.wx2sx(view, polyDraft.points[0].x), R.wy2sy(view, polyDraft.points[0].y));
      for (i = 1; i < polyDraft.points.length; i++) {
        ctx.lineTo(R.wx2sx(view, polyDraft.points[i].x), R.wy2sy(view, polyDraft.points[i].y));
      }
      ctx.stroke();
      ctx.setLineDash([]);
      for (i = 0; i < polyDraft.points.length; i++) {
        dot(R.wx2sx(view, polyDraft.points[i].x), R.wy2sy(view, polyDraft.points[i].y), i === 0 ? '#ffd479' : '#4fe3d0');
      }
      ctx.restore();
    }
    if (beltDraft && beltDraft.points.length > 1) {
      ctx.save();
      ctx.strokeStyle = '#b3a08c';
      ctx.globalAlpha = 0.7;
      ctx.lineWidth = Math.max(2, (app.beltSettings.width || 120) * view.scale);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(R.wx2sx(view, beltDraft.points[0].x), R.wy2sy(view, beltDraft.points[0].y));
      for (i = 1; i < beltDraft.points.length; i++) {
        ctx.lineTo(R.wx2sx(view, beltDraft.points[i].x), R.wy2sy(view, beltDraft.points[i].y));
      }
      ctx.stroke();
      ctx.restore();
    }
    if (gesture && (gesture.mode === 'draw-rect' || gesture.mode === 'draw-circle')) {
      ctx.save();
      ctx.strokeStyle = '#4fe3d0';
      ctx.setLineDash([5, 5]);
      ctx.lineWidth = 1.5;
      if (gesture.mode === 'draw-rect') {
        var x0 = Math.min(gesture.a.x, gesture.b.x);
        var y0 = Math.min(gesture.a.y, gesture.b.y);
        ctx.strokeRect(R.wx2sx(view, x0), R.wy2sy(view, y0),
          Math.abs(gesture.b.x - gesture.a.x) * view.scale, Math.abs(gesture.b.y - gesture.a.y) * view.scale);
      } else {
        var rr = Math.hypot(gesture.b.x - gesture.a.x, gesture.b.y - gesture.a.y);
        ctx.beginPath();
        ctx.arc(R.wx2sx(view, gesture.a.x), R.wy2sy(view, gesture.a.y), Math.max(2, rr * view.scale), 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.restore();
    }
  }

  function dot(x, y, color, square) {
    ctx.save();
    ctx.beginPath();
    if (square) ctx.rect(x - HANDLE_R, y - HANDLE_R, HANDLE_R * 2, HANDLE_R * 2);
    else ctx.arc(x, y, HANDLE_R, 0, Math.PI * 2);
    ctx.fillStyle = '#0b1224';
    ctx.fill();
    ctx.strokeStyle = color || '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------ selection

  function drawSelection() {
    var sel = app.sel;
    if (!sel.length) return;
    var lv = app.level();
    var i;
    for (i = 0; i < sel.length; i++) {
      var bb = refBBox(lv, sel[i]);
      if (!bb) continue;
      ctx.save();
      ctx.strokeStyle = 'rgba(79,227,208,0.85)';
      ctx.setLineDash([4, 4]);
      ctx.lineWidth = 1.4;
      ctx.strokeRect(
        R.wx2sx(view, bb.x) - 4, R.wy2sy(view, bb.y) - 4,
        bb.w * view.scale + 8, bb.h * view.scale + 8
      );
      ctx.setLineDash([]);
      ctx.restore();
    }
    var handles = handlesFor(lv, sel[sel.length - 1]);
    for (i = 0; i < handles.length; i++) {
      var h = handles[i];
      dot(R.wx2sx(view, h.x), R.wy2sy(view, h.y), h.color || '#4fe3d0', h.square);
    }
  }

  function refFixture(lv, ref) {
    if (!ref || ref.kind !== 'fixture') return null;
    return (lv.fixtures || [])[ref.index] || null;
  }

  function refBBox(lv, ref) {
    if (!ref) return null;
    if (ref.kind === 'ship') return { x: lv.ship.x - 14, y: lv.ship.y - 14, w: 28, h: 28 };
    if (ref.kind === 'target') return { x: lv.target.x - lv.target.r, y: lv.target.y - lv.target.r, w: lv.target.r * 2, h: lv.target.r * 2 };
    if (ref.kind === 'solution') {
      var w = (lv.solution || [])[ref.index];
      if (!w) return null;
      var kr = Sim.killRadius(w.charges || 1);
      return { x: w.x - kr, y: w.y - kr, w: kr * 2, h: kr * 2 };
    }
    var f = refFixture(lv, ref);
    if (!f) return null;
    return T.fixtureBBox(f);
  }

  /** Draggable handles for the primary selection, in world coordinates. */
  function handlesFor(lv, ref) {
    var out = [];
    if (!ref) return out;
    var i;
    if (ref.kind === 'ship') {
      var sp = Math.hypot(lv.ship.vx || 0, lv.ship.vy || 0);
      var ang = sp > 1e-6 ? Math.atan2(lv.ship.vy || 0, lv.ship.vx || 0) : -Math.PI / 2;
      var len = 40 + sp * 0.45;
      out.push({ kind: 'ship-vel', x: lv.ship.x + Math.cos(ang) * len, y: lv.ship.y + Math.sin(ang) * len, color: '#4fe3d0' });
      return out;
    }
    if (ref.kind === 'target') {
      out.push({ kind: 'target-r', x: lv.target.x + lv.target.r, y: lv.target.y, color: '#ffb347' });
      var tp = lv.target.path || [];
      for (i = 0; i < tp.length; i++) out.push({ kind: 'target-path', index: i, x: tp[i].x, y: tp[i].y, color: '#ffb347', square: true });
      for (i = 1; i < tp.length; i++) {
        out.push({ kind: 'target-path-add', index: i, x: (tp[i].x + tp[i - 1].x) / 2, y: (tp[i].y + tp[i - 1].y) / 2, color: '#8ea2c6' });
      }
      return out;
    }
    if (ref.kind === 'solution') return out;

    var f = refFixture(lv, ref);
    if (!f) return out;
    if (f.type === 'wormhole') {
      var r = f.r != null ? f.r : 26;
      out.push({ kind: 'mouth', mouth: 'a', x: f.a.x, y: f.a.y, color: '#7fd8ff', square: true });
      out.push({ kind: 'mouth', mouth: 'b', x: f.b.x, y: f.b.y, color: '#c58bff', square: true });
      out.push({ kind: 'mouth-angle', mouth: 'a', x: f.a.x + Math.cos(f.a.angle || 0) * (r + 26), y: f.a.y + Math.sin(f.a.angle || 0) * (r + 26), color: '#7fd8ff' });
      out.push({ kind: 'mouth-angle', mouth: 'b', x: f.b.x + Math.cos(f.b.angle || 0) * (r + 26), y: f.b.y + Math.sin(f.b.angle || 0) * (r + 26), color: '#c58bff' });
      return out;
    }
    if (f.shape === 'rect') {
      out.push({ kind: 'rect-corner', x: f.x + f.w, y: f.y + f.h, color: '#4fe3d0', square: true });
      out.push({ kind: 'rect-origin', x: f.x, y: f.y, color: '#8ea2c6', square: true });
      return out;
    }
    if (f.shape === 'poly') {
      var pts = f.points || [];
      for (i = 0; i < pts.length; i++) out.push({ kind: 'poly-pt', index: i, x: pts[i].x, y: pts[i].y, color: '#4fe3d0', square: true });
      for (i = 0; i < pts.length; i++) {
        var j = (i + 1) % pts.length;
        out.push({ kind: 'poly-add', index: j, x: (pts[i].x + pts[j].x) / 2, y: (pts[i].y + pts[j].y) / 2, color: '#8ea2c6' });
      }
      return out;
    }
    if (f.path) {
      var pp = f.path;
      for (i = 0; i < pp.length; i++) out.push({ kind: 'path-pt', index: i, x: pp[i].x, y: pp[i].y, color: '#b3a08c', square: true });
      for (i = 1; i < pp.length; i++) {
        out.push({ kind: 'path-add', index: i, x: (pp[i].x + pp[i - 1].x) / 2, y: (pp[i].y + pp[i - 1].y) / 2, color: '#8ea2c6' });
      }
      return out;
    }
    if (RADIUS_TYPES[f.type] && f.r != null) {
      out.push({ kind: 'radius', x: f.x + f.r, y: f.y, color: '#4fe3d0' });
    }
    if ((f.type === 'drone' || f.type === 'hunter' || f.type === 'asteroid' || f.type === 'ore') && !f.path) {
      var v = Math.hypot(f.vx || 0, f.vy || 0);
      var va = v > 1e-6 ? Math.atan2(f.vy || 0, f.vx || 0) : 0;
      var vl = 40 + v * 0.45;
      out.push({ kind: 'vel', x: f.x + Math.cos(va) * vl, y: f.y + Math.sin(va) * vl, color: '#e05ce0' });
    }
    return out;
  }

  function hitHandle(lv, sx, sy) {
    var sel = app.sel;
    if (!sel.length) return null;
    var ref = sel[sel.length - 1];
    var handles = handlesFor(lv, ref);
    for (var i = 0; i < handles.length; i++) {
      var h = handles[i];
      if (Math.hypot(R.wx2sx(view, h.x) - sx, R.wy2sy(view, h.y) - sy) <= HANDLE_HIT) {
        return { ref: ref, handle: h };
      }
    }
    return null;
  }

  /** Topmost object under a screen point, or null. */
  function hitTest(lv, sx, sy) {
    var p = toWorld(sx, sy);
    var pad = HANDLE_HIT / view.scale;
    var i, f;

    var wells = app.displayWells();
    for (i = wells.length - 1; i >= 0; i--) {
      if (Math.hypot(wells[i].x - p.x, wells[i].y - p.y) <= Sim.killRadius(wells[i].charges || 1) + pad) {
        return { kind: 'solution', index: i };
      }
    }
    if (lv.ship && Math.hypot(lv.ship.x - p.x, lv.ship.y - p.y) <= Sim.SHIP_RADIUS + pad) return { kind: 'ship', index: 0 };
    if (lv.target && Math.hypot(lv.target.x - p.x, lv.target.y - p.y) <= lv.target.r + pad) return { kind: 'target', index: 0 };

    var fixtures = lv.fixtures || [];
    // later fixtures draw on top, so search backwards; zones last (they are big)
    for (i = fixtures.length - 1; i >= 0; i--) {
      f = fixtures[i];
      if (f.type === 'deadZone' || f.type === 'allowedZone') continue;
      if (hitFixture(f, p, pad)) return { kind: 'fixture', index: i };
    }
    for (i = fixtures.length - 1; i >= 0; i--) {
      f = fixtures[i];
      if (f.type !== 'deadZone' && f.type !== 'allowedZone') continue;
      if (hitFixture(f, p, pad)) return { kind: 'fixture', index: i };
    }
    return null;
  }

  function hitFixture(f, p, pad) {
    if (f.type === 'wormhole') {
      var r = (f.r != null ? f.r : 26) + pad;
      return Math.hypot(f.a.x - p.x, f.a.y - p.y) <= r || Math.hypot(f.b.x - p.x, f.b.y - p.y) <= r;
    }
    if (f.shape === 'rect') {
      return p.x >= f.x - pad && p.x <= f.x + f.w + pad && p.y >= f.y - pad && p.y <= f.y + f.h + pad;
    }
    if (f.shape === 'poly') return T.pointInPoly(f.points || [], p.x, p.y);
    if (f.path && f.path.length) {
      for (var i = 0; i < f.path.length; i++) {
        if (Math.hypot(f.path[i].x - p.x, f.path[i].y - p.y) <= (f.r || 20) + pad) return true;
      }
      return false;
    }
    var rr = f.r != null ? f.r : f.type === 'well' || f.type === 'repulsor' ? Sim.killRadius(f.charges || 1) : 16;
    return Math.hypot(f.x - p.x, f.y - p.y) <= rr + pad;
  }

  // ------------------------------------------------------------- mutation

  function moveRef(lv, ref, dx, dy) {
    if (ref.kind === 'ship') { lv.ship.x += dx; lv.ship.y += dy; return; }
    if (ref.kind === 'target') {
      lv.target.x += dx; lv.target.y += dy;
      if (lv.target.path) for (var q = 0; q < lv.target.path.length; q++) { lv.target.path[q].x += dx; lv.target.path[q].y += dy; }
      return;
    }
    if (ref.kind === 'solution') {
      var w = (lv.solution || [])[ref.index];
      if (w) { w.x += dx; w.y += dy; }
      return;
    }
    var f = refFixture(lv, ref);
    if (!f) return;
    var i;
    if (f.type === 'wormhole') {
      f.a.x += dx; f.a.y += dy; f.b.x += dx; f.b.y += dy;
      return;
    }
    if (f.shape === 'poly') {
      for (i = 0; i < (f.points || []).length; i++) { f.points[i].x += dx; f.points[i].y += dy; }
      return;
    }
    if (f.path) {
      for (i = 0; i < f.path.length; i++) { f.path[i].x += dx; f.path[i].y += dy; }
      if (f.x != null) { f.x += dx; f.y += dy; }
      return;
    }
    f.x = (f.x || 0) + dx;
    f.y = (f.y || 0) + dy;
  }

  function applyHandle(lv, ref, handle, world) {
    var f = refFixture(lv, ref);
    switch (handle.kind) {
      case 'ship-vel': {
        var dx = world.x - lv.ship.x;
        var dy = world.y - lv.ship.y;
        var d = Math.hypot(dx, dy);
        var speed = Math.max(0, (d - 40) / 0.45);
        var a = d > 1e-6 ? Math.atan2(dy, dx) : -Math.PI / 2;
        lv.ship.vx = Math.round(Math.cos(a) * speed);
        lv.ship.vy = Math.round(Math.sin(a) * speed);
        return;
      }
      case 'target-r':
        lv.target.r = Math.max(8, Math.round(Math.hypot(world.x - lv.target.x, world.y - lv.target.y)));
        return;
      case 'target-path':
        lv.target.path[handle.index].x = world.x;
        lv.target.path[handle.index].y = world.y;
        return;
      case 'radius':
        f.r = Math.max(4, Math.round(Math.hypot(world.x - f.x, world.y - f.y)));
        return;
      case 'vel': {
        var vdx = world.x - f.x;
        var vdy = world.y - f.y;
        var vd = Math.hypot(vdx, vdy);
        var vs = Math.max(0, (vd - 40) / 0.45);
        var va = vd > 1e-6 ? Math.atan2(vdy, vdx) : 0;
        f.vx = Math.round(Math.cos(va) * vs);
        f.vy = Math.round(Math.sin(va) * vs);
        return;
      }
      case 'rect-corner':
        f.w = Math.max(10, Math.round(world.x - f.x));
        f.h = Math.max(10, Math.round(world.y - f.y));
        return;
      case 'rect-origin': {
        var right = f.x + f.w;
        var bottom = f.y + f.h;
        f.x = Math.min(right - 10, Math.round(world.x));
        f.y = Math.min(bottom - 10, Math.round(world.y));
        f.w = right - f.x;
        f.h = bottom - f.y;
        return;
      }
      case 'poly-pt':
        f.points[handle.index].x = Math.round(world.x);
        f.points[handle.index].y = Math.round(world.y);
        return;
      case 'path-pt':
        f.path[handle.index].x = Math.round(world.x);
        f.path[handle.index].y = Math.round(world.y);
        return;
      case 'mouth':
        f[handle.mouth].x = Math.round(world.x);
        f[handle.mouth].y = Math.round(world.y);
        return;
      case 'mouth-angle': {
        var m = f[handle.mouth];
        m.angle = Math.atan2(world.y - m.y, world.x - m.x);
        return;
      }
      default:
        return;
    }
  }

  /** "+" handles insert a point, then the drag continues on the new point. */
  function expandAddHandle(lv, ref, handle) {
    var f = refFixture(lv, ref);
    if (handle.kind === 'poly-add') {
      f.points.splice(handle.index, 0, { x: Math.round(handle.x), y: Math.round(handle.y) });
      return { kind: 'poly-pt', index: handle.index, x: handle.x, y: handle.y };
    }
    if (handle.kind === 'path-add') {
      f.path.splice(handle.index, 0, { x: Math.round(handle.x), y: Math.round(handle.y) });
      return { kind: 'path-pt', index: handle.index, x: handle.x, y: handle.y };
    }
    if (handle.kind === 'target-path-add') {
      lv.target.path.splice(handle.index, 0, { x: Math.round(handle.x), y: Math.round(handle.y) });
      return { kind: 'target-path', index: handle.index, x: handle.x, y: handle.y };
    }
    return handle;
  }

  // --------------------------------------------------------------- tools

  function placeAt(world) {
    var tool = app.tool;
    var lv = app.level();
    if (tool === 'ship') {
      lv.ship.x = Math.round(world.x);
      lv.ship.y = Math.round(world.y);
      app.setSel([{ kind: 'ship', index: 0 }]);
      app.commit('Move ship');
      app.afterPlace();
      return;
    }
    if (tool === 'target') {
      lv.target.x = Math.round(world.x);
      lv.target.y = Math.round(world.y);
      app.setSel([{ kind: 'target', index: 0 }]);
      app.commit('Move target');
      app.afterPlace();
      return;
    }
    var fx = makeFixture(tool, Math.round(world.x), Math.round(world.y), lv);
    if (!fx) return;
    if (!lv.fixtures) lv.fixtures = [];
    lv.fixtures.push(fx);
    app.setSel([{ kind: 'fixture', index: lv.fixtures.length - 1 }]);
    app.commit('Add ' + fx.type);
    app.afterPlace();
  }

  function startPoly(world) {
    var lv = app.level();
    if (!polyDraft) {
      polyDraft = { tool: app.tool, points: [] };
      app.setToolstrip('Tap points · first point or Done closes');
    }
    var first = polyDraft.points[0];
    if (first && polyDraft.points.length >= 3 &&
        Math.hypot(R.wx2sx(view, first.x) - R.wx2sx(view, world.x), R.wy2sy(view, first.y) - R.wy2sy(view, world.y)) < HANDLE_HIT) {
      finishPoly();
      return;
    }
    polyDraft.points.push({ x: Math.round(world.x), y: Math.round(world.y) });
    draw();
  }

  // A polygon obstacle also carries the circle the sim collides against; keep
  // it at the polygon's centroid with the radius of the largest circle that
  // stays inside (approximated by the nearest edge distance).
  function polyCircleFallback(f) {
    var pts = f.points || [];
    if (pts.length < 3) return;
    var cx = 0, cy = 0, i;
    for (i = 0; i < pts.length; i++) { cx += pts[i].x; cy += pts[i].y; }
    cx /= pts.length;
    cy /= pts.length;
    var best = Infinity;
    for (i = 0; i < pts.length; i++) {
      var a = pts[i];
      var b = pts[(i + 1) % pts.length];
      var dx = b.x - a.x, dy = b.y - a.y;
      var len2 = dx * dx + dy * dy;
      var u = len2 > 1e-9 ? ((cx - a.x) * dx + (cy - a.y) * dy) / len2 : 0;
      u = u < 0 ? 0 : u > 1 ? 1 : u;
      var d = Math.hypot(cx - (a.x + dx * u), cy - (a.y + dy * u));
      if (d < best) best = d;
    }
    f.x = Math.round(cx);
    f.y = Math.round(cy);
    f.r = Math.max(4, Math.round(isFinite(best) ? best : 20));
  }

  function finishPoly() {
    if (!polyDraft) return;
    var pts = polyDraft.points;
    var tool = polyDraft.tool;
    polyDraft = null;
    app.setToolstrip(null);
    if (pts.length < 3) {
      app.toast('A polygon needs at least 3 points');
      draw();
      return;
    }
    var lv = app.level();
    var fx = makeFixture(tool, 0, 0, lv);
    fx.points = pts;
    if (fx.type === 'obstacle') polyCircleFallback(fx);
    if (!lv.fixtures) lv.fixtures = [];
    lv.fixtures.push(fx);
    app.setSel([{ kind: 'fixture', index: lv.fixtures.length - 1 }]);
    app.commit('Add ' + fx.type);
    app.afterPlace();
  }

  function cancelPoly() {
    polyDraft = null;
    app.setToolstrip(null);
    draw();
  }

  function finishBelt() {
    var pts = beltDraft ? beltDraft.points : [];
    beltDraft = null;
    if (pts.length < 2) { draw(); return; }
    var lv = app.level();
    var s = app.beltSettings;
    var belt = T.newBelt({
      id: T.nextBeltId(lv),
      kind: s.kind,
      seed: s.seed,
      stroke: pts,
      width: s.width,
      density: s.density,
      rMin: s.rMin,
      rMax: s.rMax,
      vx: s.vx,
      vy: s.vy
    });
    T.applyBelt(lv, belt);
    app.setSel([{ kind: 'belt', index: 0, beltId: belt.id }]);
    app.commit('Add belt');
    app.afterPlace();
  }

  // ------------------------------------------------------------- pointers

  function onPointerDown(e) {
    if (e.button != null && e.button > 0) return;
    // Capture keeps a drag alive over the zoom buttons and the panel edge; a
    // synthetic pointer (tests) has nothing to capture, which is not an error.
    try { canvasEl.setPointerCapture(e.pointerId); } catch (err) { /* no live pointer */ }
    var p = eventPoint(e);
    pointers[e.pointerId] = { x: p.x, y: p.y, x0: p.x, y0: p.y, t0: Date.now() };
    pointerCount++;

    if (pointerCount === 2) {
      gesture = null;
      var ids = Object.keys(pointers);
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      pinch = {
        dist: Math.hypot(a.x - b.x, a.y - b.y) || 1,
        mx: (a.x + b.x) / 2,
        my: (a.y + b.y) / 2
      };
      return;
    }
    if (pointerCount > 2) return;

    var lv = app.level();
    if (!lv) return;

    if (app.pickMode) {
      gesture = { mode: 'pick', start: p };
      return;
    }
    if (app.tool === 'belt') {
      beltDraft = { points: [toWorld(p.x, p.y)] };
      gesture = { mode: 'belt', start: p };
      return;
    }
    if (isPolyTool(app.tool)) {
      gesture = { mode: 'poly', start: p };
      return;
    }
    if (isRectTool(app.tool) || isCircleTool(app.tool)) {
      var w0 = toWorld(p.x, p.y);
      gesture = { mode: isRectTool(app.tool) ? 'draw-rect' : 'draw-circle', start: p, a: w0, b: w0 };
      return;
    }
    if (app.tool !== 'select') {
      gesture = { mode: 'place', start: p };
      return;
    }

    var hh = hitHandle(lv, p.x, p.y);
    if (hh) {
      var handle = hh.handle;
      if (handle.kind === 'poly-add' || handle.kind === 'path-add' || handle.kind === 'target-path-add') {
        handle = expandAddHandle(lv, hh.ref, handle);
      }
      gesture = { mode: 'handle', start: p, ref: hh.ref, handle: handle, dirty: false };
      return;
    }
    var hit = hitTest(lv, p.x, p.y);
    if (hit) {
      var already = app.isSelected(hit);
      if (!already) {
        if (e.shiftKey || e.metaKey || e.ctrlKey || app.multiSelect) app.addSel(hit);
        else app.setSel([hit]);
        app.refreshPanel();
      }
      gesture = { mode: 'object', start: p, last: toWorld(p.x, p.y), moved: false, hit: hit };
      draw();
      return;
    }
    gesture = { mode: 'pan', start: p, ox: view.ox, oy: view.oy };
  }

  function onPointerMove(e) {
    var rec = pointers[e.pointerId];
    if (!rec) return;   // a move with no button down: nothing to update
    var p = eventPoint(e);
    rec.x = p.x;
    rec.y = p.y;

    if (pinch) {
      var ids = Object.keys(pointers);
      if (ids.length < 2) return;
      var a = pointers[ids[0]];
      var b = pointers[ids[1]];
      var dist = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      var mx = (a.x + b.x) / 2;
      var my = (a.y + b.y) / 2;
      view.ox += mx - pinch.mx;
      view.oy += my - pinch.my;
      pinch.mx = mx;
      pinch.my = my;
      zoomAt(mx, my, dist / pinch.dist);
      pinch.dist = dist;
      return;
    }
    if (!gesture) return;

    var lv = app.level();
    if (gesture.mode === 'pan') {
      view.ox = gesture.ox + (p.x - gesture.start.x);
      view.oy = gesture.oy + (p.y - gesture.start.y);
      camMoved = true;
      draw();
      return;
    }
    if (gesture.mode === 'object') {
      var w = toWorld(p.x, p.y);
      if (!gesture.moved && Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y) < TAP_PX) return;
      gesture.moved = true;
      var dx = w.x - gesture.last.x;
      var dy = w.y - gesture.last.y;
      gesture.last = w;
      for (var i = 0; i < app.sel.length; i++) moveRef(lv, app.sel[i], dx, dy);
      app.onLiveEdit();
      draw();
      return;
    }
    if (gesture.mode === 'handle') {
      gesture.dirty = true;
      applyHandle(lv, gesture.ref, gesture.handle, toWorld(p.x, p.y));
      app.onLiveEdit();
      draw();
      return;
    }
    if (gesture.mode === 'draw-rect' || gesture.mode === 'draw-circle') {
      gesture.b = toWorld(p.x, p.y);
      draw();
      return;
    }
    if (gesture.mode === 'belt' && beltDraft) {
      var wp = toWorld(p.x, p.y);
      var last = beltDraft.points[beltDraft.points.length - 1];
      if (Math.hypot(wp.x - last.x, wp.y - last.y) * view.scale > 6) beltDraft.points.push(wp);
      draw();
    }
  }

  function onPointerUp(e) {
    var rec = pointers[e.pointerId];
    if (rec) {
      delete pointers[e.pointerId];
      pointerCount = Math.max(0, pointerCount - 1);
    }
    try { canvasEl.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }

    if (pinch) {
      if (pointerCount < 2) { pinch = null; gesture = null; }
      return;
    }
    if (!gesture || !rec) return;
    var p = eventPoint(e);
    var moved = Math.hypot(p.x - gesture.start.x, p.y - gesture.start.y);
    var quick = Date.now() - rec.t0 < TAP_MS;
    var isTap = moved <= TAP_PX && quick;
    var lv = app.level();
    var g = gesture;
    gesture = null;

    if (g.mode === 'pick') {
      if (isTap && app.pickMode) {
        // Read the world point BEFORE dismissing the strip: hiding it frees up
        // board area and re-fits the camera, which would move the point.
        var picked = toWorld(p.x, p.y);
        var cb = app.pickMode;
        app.pickMode = null;
        app.setToolstrip(null);
        cb(picked);
      }
      return;
    }
    if (g.mode === 'poly') {
      if (isTap) startPoly(toWorld(p.x, p.y));
      return;
    }
    if (g.mode === 'place') {
      if (isTap) placeAt(toWorld(p.x, p.y));
      return;
    }
    if (g.mode === 'draw-rect') {
      if (isTap) { placeAt(toWorld(p.x, p.y)); return; }
      var x0 = Math.min(g.a.x, g.b.x), y0 = Math.min(g.a.y, g.b.y);
      var w = Math.abs(g.b.x - g.a.x), h = Math.abs(g.b.y - g.a.y);
      if (w < 8 || h < 8) { draw(); return; }
      var fr = makeFixture(app.tool, 0, 0, lv);
      fr.x = Math.round(x0); fr.y = Math.round(y0);
      fr.w = Math.round(w); fr.h = Math.round(h);
      if (!lv.fixtures) lv.fixtures = [];
      lv.fixtures.push(fr);
      app.setSel([{ kind: 'fixture', index: lv.fixtures.length - 1 }]);
      app.commit('Add ' + fr.type);
      app.afterPlace();
      return;
    }
    if (g.mode === 'draw-circle') {
      if (isTap) { placeAt(toWorld(p.x, p.y)); return; }
      var rr = Math.hypot(g.b.x - g.a.x, g.b.y - g.a.y);
      if (rr < 6) { draw(); return; }
      var fc = makeFixture(app.tool, Math.round(g.a.x), Math.round(g.a.y), lv);
      fc.r = Math.round(rr);
      if (!lv.fixtures) lv.fixtures = [];
      lv.fixtures.push(fc);
      app.setSel([{ kind: 'fixture', index: lv.fixtures.length - 1 }]);
      app.commit('Add ' + fc.type);
      app.afterPlace();
      return;
    }
    if (g.mode === 'belt') {
      finishBelt();
      return;
    }
    if (g.mode === 'object') {
      if (g.moved) app.commit('Move');
      else if (isTap) { app.setSel([g.hit]); app.refreshPanel(); draw(); }
      return;
    }
    if (g.mode === 'handle') {
      if (g.dirty) app.commit('Edit');
      return;
    }
    if (g.mode === 'pan' && isTap) {
      if (app.sel.length) { app.setSel([]); app.refreshPanel(); }
      draw();
    }
  }

  function onWheel(e) {
    e.preventDefault();
    var p = eventPoint(e);
    var k = Math.pow(0.9985, e.deltaY);
    zoomAt(p.x, p.y, k);
  }

  canvasEl.addEventListener('pointerdown', onPointerDown);
  canvasEl.addEventListener('pointermove', onPointerMove);
  canvasEl.addEventListener('pointerup', onPointerUp);
  canvasEl.addEventListener('pointercancel', onPointerUp);
  canvasEl.addEventListener('wheel', onWheel, { passive: false });
  canvasEl.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  window.addEventListener('resize', resize);

  resize();

  // A slow repaint keeps the pulsing target / tutorial markers alive without
  // pinning a rAF loop at 60fps in an editor that is mostly static.
  var timer = setInterval(function () {
    if (document.hidden) return;
    draw();
  }, 120);

  return {
    view: view,
    draw: draw,
    fit: fit,
    resize: resize,
    toWorld: toWorld,
    worldToScreen: function (x, y) { return { x: R.wx2sx(view, x), y: R.wy2sy(view, y) }; },
    zoomAt: zoomAt,
    zoomBy: function (k) { zoomAt(view.cssW / 2, view.cssH / 2, k); },
    // The tool strip floats over the board; when it appears or disappears the
    // usable area changes, so re-fit unless the designer has moved the camera.
    notifyChrome: function () { if (!camMoved) fit(); },
    finishPoly: finishPoly,
    cancelPoly: cancelPoly,
    hasPolyDraft: function () { return !!polyDraft; },
    destroy: function () { clearInterval(timer); }
  };
}
