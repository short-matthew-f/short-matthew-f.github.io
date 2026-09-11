// Gravity Well — render.js
// Pure canvas drawing. No DOM queries, no game state mutation: every function
// takes (ctx, view, data) and paints. World->screen is a letterboxed uniform
// scale; all drawing happens in CSS pixels (the caller applies devicePixelRatio
// via ctx.setTransform before calling in).

export const COLORS = {
  bg: '#05070f',
  bgDeep: '#02030a',
  bounds: '#1d2b4a',
  boundsGlow: '#2b4372',
  star: '#cfe0ff',
  field: '#5f7fbf',
  ship: '#4fe3d0',
  shipDim: '#2b8c81',
  target: '#ffb347',
  well: '#9b6cff',
  wellCore: '#120a24',
  wellRim: '#c9a7ff',
  obstacle: '#6b7280',
  obstacleEdge: '#98a2b3',
  asteroid: '#8a7a6a',
  asteroidEdge: '#b3a08c',
  drone: '#e05ce0',
  hunter: '#ff4d4d',
  ore: '#f0c060',
  receiver: '#f0c060',
  immune: '#dfe7ff',
  text: '#dfe7ff',
  bad: '#ff6b6b',
  good: '#7CF6B0'
};

// ---------------------------------------------------------------- transform

// Fit world bounds into the canvas area, leaving `pad` (CSS px) on each edge.
// Returns {scale, ox, oy} such that screenX = worldX * scale + ox.
export function computeView(cssW, cssH, bounds, pad) {
  var p = pad || {};
  var top = p.top || 0, bottom = p.bottom || 0, left = p.left || 0, right = p.right || 0;
  var availW = Math.max(20, cssW - left - right);
  var availH = Math.max(20, cssH - top - bottom);
  var scale = Math.min(availW / bounds.w, availH / bounds.h);
  var ox = left + (availW - bounds.w * scale) / 2;
  var oy = top + (availH - bounds.h * scale) / 2;
  return { scale: scale, ox: ox, oy: oy, cssW: cssW, cssH: cssH };
}

export function wx2sx(view, x) { return x * view.scale + view.ox; }
export function wy2sy(view, y) { return y * view.scale + view.oy; }
export function screenToWorld(view, sx, sy) {
  return { x: (sx - view.ox) / view.scale, y: (sy - view.oy) / view.scale };
}

// --------------------------------------------------------------- determinism

// Small string/number hash -> 32-bit uint. No Math.random anywhere in here.
export function hashString(str) {
  var h = 2166136261;
  for (var i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h >>> 0;
}

// Deterministic 0..1 generator seeded from a uint32.
function makeRng(seed) {
  var s = (seed >>> 0) || 1;
  return function () {
    s ^= s << 13; s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

// ---------------------------------------------------------------- starfield

var starCache = { key: '', canvas: null };

// Offscreen starfield generated once per (levelId, size, dpr) from a seeded hash.
export function getStarfield(levelId, cssW, cssH, dpr) {
  var key = levelId + '|' + Math.round(cssW) + 'x' + Math.round(cssH) + '@' + dpr;
  if (starCache.key === key && starCache.canvas) return starCache.canvas;
  var c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(cssW * dpr));
  c.height = Math.max(1, Math.round(cssH * dpr));
  var g = c.getContext('2d');
  g.setTransform(dpr, 0, 0, dpr, 0, 0);
  g.fillStyle = COLORS.bgDeep;
  g.fillRect(0, 0, cssW, cssH);

  var rnd = makeRng(hashString('starfield:' + levelId));
  // A couple of faint nebula blooms for depth.
  for (var n = 0; n < 3; n++) {
    var nx = rnd() * cssW, ny = rnd() * cssH, nr = (0.25 + rnd() * 0.35) * Math.max(cssW, cssH);
    var grad = g.createRadialGradient(nx, ny, 0, nx, ny, nr);
    var hue = 200 + Math.floor(rnd() * 90);
    grad.addColorStop(0, 'hsla(' + hue + ',70%,45%,0.10)');
    grad.addColorStop(1, 'hsla(' + hue + ',70%,30%,0)');
    g.fillStyle = grad;
    g.fillRect(0, 0, cssW, cssH);
  }

  var count = Math.round((cssW * cssH) / 4200);
  for (var i = 0; i < count; i++) {
    var x = rnd() * cssW, y = rnd() * cssH;
    var r = 0.35 + rnd() * 1.15;
    var a = 0.18 + rnd() * 0.62;
    g.globalAlpha = a;
    g.fillStyle = rnd() > 0.9 ? '#9fd8ff' : COLORS.star;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  }
  g.globalAlpha = 1;
  starCache.key = key;
  starCache.canvas = c;
  return c;
}

export function drawBackground(ctx, levelId, cssW, cssH, dpr) {
  ctx.save();
  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, cssW, cssH);
  var stars = getStarfield(levelId, cssW, cssH, dpr);
  ctx.drawImage(stars, 0, 0, cssW, cssH);
  ctx.restore();
}

// ------------------------------------------------------------ playfield box

export function drawBounds(ctx, view, bounds) {
  var x = wx2sx(view, 0), y = wy2sy(view, 0);
  var w = bounds.w * view.scale, h = bounds.h * view.scale;
  ctx.save();
  ctx.fillStyle = 'rgba(10,16,32,0.35)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = COLORS.bounds;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + 0.5, y + 0.5, w - 1, h - 1);
  // corner ticks
  ctx.strokeStyle = COLORS.boundsGlow;
  ctx.lineWidth = 2;
  var t = Math.min(22, w * 0.08, h * 0.08);
  var corners = [[x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]];
  for (var i = 0; i < corners.length; i++) {
    var c = corners[i];
    ctx.beginPath();
    ctx.moveTo(c[0] + c[2] * t, c[1]);
    ctx.lineTo(c[0], c[1]);
    ctx.lineTo(c[0], c[1] + c[3] * t);
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------- field arrows

// samples: [{x, y, ax, ay}] in world space (caller skips kill radii).
export function drawFieldArrows(ctx, view, samples) {
  if (!samples || !samples.length) return;
  ctx.save();
  ctx.lineCap = 'round';
  for (var i = 0; i < samples.length; i++) {
    var s = samples[i];
    var mag = Math.sqrt(s.ax * s.ax + s.ay * s.ay);
    if (mag < 1e-3) continue;
    // log-scaled length so weak far-field is still visible but never huge
    var strength = Math.min(1, Math.log10(1 + mag) / 2.6);
    if (strength < 0.06) continue;
    var len = (8 + strength * 26) * view.scale;
    var ux = s.ax / mag, uy = s.ay / mag;
    var x0 = wx2sx(view, s.x) - ux * len * 0.5;
    var y0 = wy2sy(view, s.y) - uy * len * 0.5;
    var x1 = x0 + ux * len, y1 = y0 + uy * len;
    ctx.globalAlpha = 0.14 + strength * 0.55;
    ctx.strokeStyle = COLORS.field;
    ctx.lineWidth = Math.max(0.8, 1.1 * view.scale * 1.2);
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
    // head
    var hs = Math.max(2.5, len * 0.3);
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * hs - uy * hs * 0.45, y1 - uy * hs + ux * hs * 0.45);
    ctx.moveTo(x1, y1);
    ctx.lineTo(x1 - ux * hs + uy * hs * 0.45, y1 - uy * hs - ux * hs * 0.45);
    ctx.stroke();
  }
  ctx.restore();
}

// -------------------------------------------------------------------- wells

// wells: [{x,y,charges}]; killRadiusFn(n) -> world units.
export function drawWells(ctx, view, wells, killRadiusFn, opts) {
  if (!wells) return;
  var o = opts || {};
  ctx.save();
  for (var i = 0; i < wells.length; i++) {
    var w = wells[i];
    var cx = wx2sx(view, w.x), cy = wy2sy(view, w.y);
    var kr = killRadiusFn(w.charges) * view.scale;
    var selected = o.selected === i;

    // influence rings scale with charge count
    var rings = 3;
    for (var r = rings; r >= 1; r--) {
      var rr = kr * (1 + r * 0.9 * Math.sqrt(w.charges));
      ctx.beginPath();
      ctx.arc(cx, cy, rr, 0, Math.PI * 2);
      ctx.strokeStyle = COLORS.well;
      ctx.globalAlpha = 0.05 + 0.09 / r;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    // soft glow
    ctx.globalAlpha = 1;
    var g = ctx.createRadialGradient(cx, cy, kr * 0.4, cx, cy, kr * 3.2);
    g.addColorStop(0, 'rgba(155,108,255,0.30)');
    g.addColorStop(1, 'rgba(155,108,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, kr * 3.2, 0, Math.PI * 2);
    ctx.fill();

    // lethal core + bright rim exactly at killRadius
    ctx.beginPath();
    ctx.arc(cx, cy, kr, 0, Math.PI * 2);
    ctx.fillStyle = COLORS.wellCore;
    ctx.fill();
    ctx.strokeStyle = selected ? '#ffffff' : COLORS.wellRim;
    ctx.lineWidth = selected ? 2.5 : 1.8;
    ctx.stroke();

    // charge numeral
    ctx.fillStyle = COLORS.wellRim;
    ctx.font = '600 ' + Math.max(10, Math.round(kr * 0.95)) + 'px ui-monospace, Menlo, monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(w.charges), cx, cy + 0.5);
  }
  ctx.restore();
}

// ------------------------------------------------------------------- target

export function drawTarget(ctx, view, target, t) {
  var cx = wx2sx(view, target.x), cy = wy2sy(view, target.y);
  var r = target.r * view.scale;
  var pulse = 0.5 + 0.5 * Math.sin(t * 2.4);
  ctx.save();
  ctx.strokeStyle = COLORS.target;
  ctx.lineWidth = 2;
  ctx.globalAlpha = 0.9;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.25 + 0.25 * pulse;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (1.12 + 0.10 * pulse), 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 0.65 + 0.35 * pulse;
  ctx.fillStyle = COLORS.target;
  ctx.beginPath();
  ctx.arc(cx, cy, r * (0.24 + 0.07 * pulse), 0, Math.PI * 2);
  ctx.fill();
  // cross ticks
  ctx.globalAlpha = 0.6;
  ctx.beginPath();
  for (var a = 0; a < 4; a++) {
    var ang = a * Math.PI / 2 + Math.PI / 4;
    ctx.moveTo(cx + Math.cos(ang) * r * 0.7, cy + Math.sin(ang) * r * 0.7);
    ctx.lineTo(cx + Math.cos(ang) * r * 0.95, cy + Math.sin(ang) * r * 0.95);
  }
  ctx.stroke();
  ctx.restore();
}

// --------------------------------------------------------------------- ship

// ship: {x,y,vx,vy,alive}; opts: {showVelocity, alpha}
export function drawShip(ctx, view, ship, shipRadius, opts) {
  if (!ship) return;
  var o = opts || {};
  var cx = wx2sx(view, ship.x), cy = wy2sy(view, ship.y);
  var sp = Math.sqrt(ship.vx * ship.vx + ship.vy * ship.vy);
  var ang = sp > 1e-6 ? Math.atan2(ship.vy, ship.vx) : -Math.PI / 2;
  var r = Math.max(5, shipRadius * view.scale);
  ctx.save();
  ctx.globalAlpha = o.alpha == null ? 1 : o.alpha;

  if (o.showVelocity && sp > 1e-6) {
    // short velocity vector, length proportional to speed (capped)
    var vlen = Math.min(70, sp * 0.35) * view.scale;
    ctx.strokeStyle = COLORS.shipDim;
    ctx.lineWidth = 1.5;
    ctx.setLineDash([]);
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(ang) * vlen, cy + Math.sin(ang) * vlen);
    ctx.stroke();
    var hx = cx + Math.cos(ang) * vlen, hy = cy + Math.sin(ang) * vlen;
    ctx.beginPath();
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - Math.cos(ang - 0.4) * 6, hy - Math.sin(ang - 0.4) * 6);
    ctx.moveTo(hx, hy);
    ctx.lineTo(hx - Math.cos(ang + 0.4) * 6, hy - Math.sin(ang + 0.4) * 6);
    ctx.stroke();
  }

  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(r * 1.5, 0);
  ctx.lineTo(-r * 0.9, -r * 0.85);
  ctx.lineTo(-r * 0.45, 0);
  ctx.lineTo(-r * 0.9, r * 0.85);
  ctx.closePath();
  ctx.fillStyle = 'rgba(79,227,208,0.22)';
  ctx.fill();
  ctx.strokeStyle = COLORS.ship;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
}

// ----------------------------------------------------------------- fixtures

var polyCache = {};

// Deterministic irregular polygon for an asteroid, keyed by id + radius.
function asteroidPoly(id, radius) {
  var key = id + '|' + radius;
  if (polyCache[key]) return polyCache[key];
  var rnd = makeRng(hashString('asteroid:' + key));
  var n = 8 + Math.floor(rnd() * 5);
  var pts = [];
  for (var i = 0; i < n; i++) {
    var a = (i / n) * Math.PI * 2;
    var rr = radius * (0.76 + rnd() * 0.38);
    pts.push([Math.cos(a) * rr, Math.sin(a) * rr]);
  }
  polyCache[key] = pts;
  return pts;
}

function hatch(ctx, cx, cy, r) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = COLORS.immune;
  ctx.lineWidth = 1;
  var step = Math.max(4, r * 0.33);
  for (var d = -r * 2; d < r * 2; d += step) {
    ctx.beginPath();
    ctx.moveTo(cx + d, cy - r * 1.5);
    ctx.lineTo(cx + d + r * 3, cy + r * 1.5);
    ctx.stroke();
  }
  ctx.restore();
}

function immuneOutline(ctx, cx, cy, r) {
  ctx.save();
  ctx.strokeStyle = COLORS.immune;
  ctx.globalAlpha = 0.85;
  ctx.lineWidth = 1.4;
  ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 0.45;
  ctx.beginPath(); ctx.arc(cx, cy, r + 3.5, 0, Math.PI * 2); ctx.stroke();
  ctx.restore();
}

export function drawObstacle(ctx, view, b) {
  ctx.save();
  ctx.fillStyle = 'rgba(107,114,128,0.55)';
  ctx.strokeStyle = COLORS.obstacleEdge;
  ctx.lineWidth = 1.2;
  if (b.shape === 'rect') {
    var x = wx2sx(view, b.x), y = wy2sy(view, b.y);
    var w = b.w * view.scale, h = b.h * view.scale;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    if (b.immune) {
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = COLORS.immune;
      ctx.strokeRect(x - 3, y - 3, w + 6, h + 6);
    }
  } else {
    var cx = wx2sx(view, b.x), cy = wy2sy(view, b.y), r = b.r * view.scale;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.7;
    ctx.stroke();
    if (b.immune) { hatch(ctx, cx, cy, r); immuneOutline(ctx, cx, cy, r); }
  }
  ctx.restore();
}

export function drawAsteroid(ctx, view, b, t) {
  var cx = wx2sx(view, b.x), cy = wy2sy(view, b.y);
  var r = (b.r || 14) * view.scale;
  var pts = asteroidPoly(String(b.id), Math.round(b.r || 14));
  var spin = ((hashString('spin:' + b.id) % 1000) / 1000 - 0.5) * 0.5; // rad/s
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(spin * t);
  ctx.beginPath();
  for (var i = 0; i < pts.length; i++) {
    var px = pts[i][0] * view.scale, py = pts[i][1] * view.scale;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(138,122,106,0.65)';
  ctx.fill();
  ctx.strokeStyle = COLORS.asteroidEdge;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  if (b.immune) { hatch(ctx, cx, cy, r); immuneOutline(ctx, cx, cy, r); }
}

export function drawDrone(ctx, view, b, t) {
  var cx = wx2sx(view, b.x), cy = wy2sy(view, b.y), r = (b.r || 10) * view.scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.8);
  ctx.beginPath();
  for (var i = 0; i < 6; i++) {
    var a = i * Math.PI / 3;
    var px = Math.cos(a) * r, py = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = 'rgba(224,92,224,0.28)';
  ctx.fill();
  ctx.strokeStyle = COLORS.drone;
  ctx.lineWidth = 1.6;
  ctx.stroke();
  ctx.restore();
  if (b.immune) { hatch(ctx, cx, cy, r); immuneOutline(ctx, cx, cy, r); }
}

// Hunter points toward the ship (or along velocity if no ship given).
export function drawHunter(ctx, view, b, ship) {
  var cx = wx2sx(view, b.x), cy = wy2sy(view, b.y), r = (b.r || 11) * view.scale;
  var ang;
  if (ship && ship.alive !== false) ang = Math.atan2(ship.y - b.y, ship.x - b.x);
  else ang = Math.atan2(b.vy || 0, b.vx || 1);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);
  ctx.beginPath();
  ctx.moveTo(r * 1.6, 0);
  ctx.lineTo(-r * 0.8, -r * 1.1);
  ctx.lineTo(-r * 0.2, 0);
  ctx.lineTo(-r * 0.8, r * 1.1);
  ctx.closePath();
  ctx.fillStyle = 'rgba(255,77,77,0.3)';
  ctx.fill();
  ctx.strokeStyle = COLORS.hunter;
  ctx.lineWidth = 1.8;
  ctx.stroke();
  ctx.restore();
  if (b.immune) { hatch(ctx, cx, cy, r); immuneOutline(ctx, cx, cy, r); }
}

export function drawOre(ctx, view, b, t) {
  var cx = wx2sx(view, b.x), cy = wy2sy(view, b.y), r = (b.r || 9) * view.scale;
  var pts = asteroidPoly('ore-' + b.id, Math.round(b.r || 9));
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.35);
  ctx.beginPath();
  for (var i = 0; i < pts.length; i++) {
    var px = pts[i][0] * view.scale, py = pts[i][1] * view.scale;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  var g = ctx.createLinearGradient(-r, -r, r, r);
  g.addColorStop(0, 'rgba(240,192,96,0.85)');
  g.addColorStop(1, 'rgba(160,110,40,0.7)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = COLORS.ore;
  ctx.lineWidth = 1.2;
  ctx.stroke();
  ctx.restore();
  if (b.immune) { hatch(ctx, cx, cy, r); immuneOutline(ctx, cx, cy, r); }
}

export function drawOreReceiver(ctx, view, b, t) {
  var cx = wx2sx(view, b.x), cy = wy2sy(view, b.y), r = (b.r || 50) * view.scale;
  ctx.save();
  ctx.strokeStyle = COLORS.receiver;
  ctx.globalAlpha = 0.7;
  ctx.lineWidth = 1.6;
  ctx.setLineDash([7, 6]);
  ctx.lineDashOffset = -t * 14;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.12;
  ctx.fillStyle = COLORS.receiver;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// Wormhole (world 11) and any fixture type this renderer does not know yet:
// a dashed swirl so the level is never silently missing a piece.
export function drawWormhole(ctx, view, b, t) {
  var cx = wx2sx(view, b.x), cy = wy2sy(view, b.y), r = (b.r || 22) * view.scale;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(t * 0.6);
  ctx.strokeStyle = '#7fd8ff';
  ctx.lineWidth = 1.6;
  for (var k = 0; k < 3; k++) {
    ctx.globalAlpha = 0.75 - k * 0.2;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.arc(0, 0, r * (1 - k * 0.26), 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.globalAlpha = 0.35;
  var g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, 'rgba(127,216,255,0.45)');
  g.addColorStop(1, 'rgba(127,216,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath(); ctx.arc(0, 0, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  if (b.immune) { hatch(ctx, cx, cy, r); immuneOutline(ctx, cx, cy, r); }
}

// Dispatch over a body list (state.bodies).
export function drawBodies(ctx, view, bodies, t, ship) {
  if (!bodies) return;
  // receivers first (they are background zones)
  var i, b;
  for (i = 0; i < bodies.length; i++) {
    b = bodies[i];
    if (b.alive === false) continue;
    if (b.type === 'oreReceiver') drawOreReceiver(ctx, view, b, t);
  }
  for (i = 0; i < bodies.length; i++) {
    b = bodies[i];
    if (b.alive === false) continue;
    switch (b.type) {
      case 'obstacle': drawObstacle(ctx, view, b); break;
      case 'asteroid': drawAsteroid(ctx, view, b, t); break;
      case 'drone': drawDrone(ctx, view, b, t); break;
      case 'hunter': drawHunter(ctx, view, b, ship); break;
      case 'ore': drawOre(ctx, view, b, t); break;
      default: drawWormhole(ctx, view, b, t); break;
    }
  }
}

// --------------------------------------------------------------- trajectory

// pts: [{t,x,y}]. opts: {bright, color, markers, endMark:'x'|'ring'|null}
export function drawTrajectory(ctx, view, pts, opts) {
  if (!pts || pts.length < 2) return;
  var o = opts || {};
  var bright = !!o.bright;
  var color = o.color || (bright ? COLORS.ship : '#8fa3c8');
  ctx.save();
  ctx.strokeStyle = color;
  ctx.globalAlpha = bright ? 0.95 : 0.32;
  ctx.lineWidth = bright ? 1.8 : 1.2;
  ctx.setLineDash(bright ? [4, 5] : [3, 6]);
  ctx.beginPath();
  ctx.moveTo(wx2sx(view, pts[0].x), wy2sy(view, pts[0].y));
  for (var i = 1; i < pts.length; i++) {
    ctx.lineTo(wx2sx(view, pts[i].x), wy2sy(view, pts[i].y));
  }
  ctx.stroke();
  ctx.setLineDash([]);

  if (o.markers !== false) drawTimeMarkers(ctx, view, pts, bright, color);

  var last = pts[pts.length - 1];
  var lx = wx2sx(view, last.x), ly = wy2sy(view, last.y);
  if (o.endMark === 'x') {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.bad;
    ctx.lineWidth = 2.4;
    var s = 8;
    ctx.beginPath();
    ctx.moveTo(lx - s, ly - s); ctx.lineTo(lx + s, ly + s);
    ctx.moveTo(lx + s, ly - s); ctx.lineTo(lx - s, ly + s);
    ctx.stroke();
  } else if (o.endMark === 'ring') {
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.good;
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(lx, ly, 9, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(lx, ly, 4, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

// Ticks every 1 s, numerals every 5 s.
function drawTimeMarkers(ctx, view, pts, bright, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = bright ? 1.6 : 1;
  ctx.font = '600 10px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  var nextMark = 1;
  for (var i = 1; i < pts.length; i++) {
    var p = pts[i], q = pts[i - 1];
    while (p.t >= nextMark - 1e-9) {
      var u = (p.t - q.t) > 1e-9 ? (nextMark - q.t) / (p.t - q.t) : 0;
      var mxw = q.x + (p.x - q.x) * u, myw = q.y + (p.y - q.y) * u;
      var mx = wx2sx(view, mxw), my = wy2sy(view, myw);
      var dx = p.x - q.x, dy = p.y - q.y;
      var m = Math.sqrt(dx * dx + dy * dy) || 1;
      var nx = -dy / m, ny = dx / m;
      var half = (nextMark % 5 === 0 ? 5 : 3) * (bright ? 1 : 0.8);
      ctx.globalAlpha = bright ? 0.85 : 0.3;
      ctx.beginPath();
      ctx.moveTo(mx - nx * half, my - ny * half);
      ctx.lineTo(mx + nx * half, my + ny * half);
      ctx.stroke();
      if (nextMark % 5 === 0) {
        ctx.globalAlpha = bright ? 0.9 : 0.35;
        ctx.fillText(nextMark + 's', mx + nx * 8 + 2, my + ny * 8);
      }
      nextMark += 1;
    }
  }
  ctx.restore();
}

// Find the sampled point nearest time t.
export function sampleAt(pts, t) {
  if (!pts || !pts.length) return null;
  var best = pts[0], bestD = Math.abs(pts[0].t - t);
  for (var i = 1; i < pts.length; i++) {
    var d = Math.abs(pts[i].t - t);
    if (d < bestD) { bestD = d; best = pts[i]; }
  }
  return best;
}

// ca: {id, dist, t}; shipPts and bodyPts are sampled arrays.
export function drawClosestApproach(ctx, view, shipPts, bodyPts, ca) {
  if (!ca || !shipPts || !bodyPts) return;
  var a = sampleAt(shipPts, ca.t), b = sampleAt(bodyPts, ca.t);
  if (!a || !b) return;
  var ax = wx2sx(view, a.x), ay = wy2sy(view, a.y);
  var bx = wx2sx(view, b.x), by = wy2sy(view, b.y);
  var close = ca.dist < 60;
  ctx.save();
  ctx.strokeStyle = close ? COLORS.bad : '#8fa3c8';
  ctx.globalAlpha = close ? 0.85 : 0.45;
  ctx.lineWidth = 1.2;
  ctx.setLineDash([2, 4]);
  ctx.beginPath();
  ctx.moveTo(ax, ay);
  ctx.lineTo(bx, by);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.arc(ax, ay, 3, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(bx, by, 3, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = close ? COLORS.bad : '#b7c6e0';
  ctx.font = '600 11px ui-monospace, Menlo, monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  ctx.globalAlpha = 1;
  ctx.fillText(Math.round(ca.dist) + 'u @ ' + ca.t.toFixed(1) + 's', (ax + bx) / 2, (ay + by) / 2 - 4);
  ctx.restore();
}

// ------------------------------------------------------------------- trails

// trail: [{x,y}] oldest..newest
export function drawTrail(ctx, view, trail, color, width) {
  if (!trail || trail.length < 2) return;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = color;
  ctx.lineWidth = width || 1.6;
  var n = trail.length;
  for (var i = 1; i < n; i++) {
    ctx.globalAlpha = (i / n) * 0.55;
    ctx.beginPath();
    ctx.moveTo(wx2sx(view, trail[i - 1].x), wy2sy(view, trail[i - 1].y));
    ctx.lineTo(wx2sx(view, trail[i].x), wy2sy(view, trail[i].y));
    ctx.stroke();
  }
  ctx.restore();
}

// ------------------------------------------------------------- tutorial hint

// hint: {x, y} world position. Pulsing ring + "tap here".
export function drawHint(ctx, view, hint, t) {
  if (!hint) return;
  var cx = wx2sx(view, hint.x), cy = wy2sy(view, hint.y);
  var pulse = (t * 0.9) % 1;
  ctx.save();
  ctx.strokeStyle = '#ffd479';
  for (var k = 0; k < 2; k++) {
    var p = (pulse + k * 0.5) % 1;
    ctx.globalAlpha = (1 - p) * 0.7;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx, cy, 10 + p * 34, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 0.95;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, 9, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd479';
  ctx.font = '600 12px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText('tap here', cx, cy + 48);
  ctx.restore();
}
