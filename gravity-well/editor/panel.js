// Gravity Well — editor/panel.js
//
// The tool panel: a bottom sheet on a phone, a right sidebar on a desktop,
// with six tabs — Palette, Inspect, Level, Tutorial, Analyse, Pack.
//
// Rules this module follows throughout:
// * every numeric control is a real <input type="number"> with a stable id
//   (`insp-x`, `lvl-charges`, `an-samples`, ...) so both a thumb and a test can
//   drive it;
// * typing in a field edits the model and repaints the CANVAS only — the panel
//   is not rebuilt under the user's finger. A pane is rebuilt only when the
//   selection signature changes; otherwise values are synced into the existing
//   inputs, skipping whichever one has focus;
// * every destructive action goes through app.confirm().
//
// The panel never touches the sim. Analysis is asked for through app.analyse()
// (which owns the Web Worker) and arrives back as plain data.

import * as T from './tools.js';

// ---------------------------------------------------------------------------
// Tiny DOM helpers
// ---------------------------------------------------------------------------

function h(tag, attrs, kids) {
  var el = document.createElement(tag);
  var k;
  if (attrs) {
    for (k in attrs) {
      if (!Object.prototype.hasOwnProperty.call(attrs, k)) continue;
      var v = attrs[k];
      if (k === 'class') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else if (v === true) el.setAttribute(k, '');
      else if (v !== false && v != null) el.setAttribute(k, v);
    }
  }
  if (kids) {
    for (var i = 0; i < kids.length; i++) {
      if (kids[i] == null) continue;
      el.appendChild(typeof kids[i] === 'string' ? document.createTextNode(kids[i]) : kids[i]);
    }
  }
  return el;
}

function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
}

function round(n) {
  return Math.round((n || 0) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export function createPanel(app) {
  var panes = {
    palette: document.getElementById('panel-palette'),
    inspect: document.getElementById('panel-inspect'),
    level: document.getElementById('panel-level'),
    tutorial: document.getElementById('panel-tutorial'),
    analyse: document.getElementById('panel-analyse'),
    pack: document.getElementById('panel-pack')
  };
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.ed-tab'));
  var current = 'palette';
  var sigs = { inspect: '', level: '', tutorial: '', pack: '' };
  var fields = { inspect: [], level: [], tutorial: [], pack: [] };
  var analyseOut = null;
  var analyseBar = null;

  for (var i = 0; i < tabs.length; i++) {
    (function (btn) {
      btn.addEventListener('click', function () { setTab(btn.getAttribute('data-tab')); });
    })(tabs[i]);
  }

  function setTab(name) {
    if (!panes[name]) return;
    current = name;
    for (var k in panes) {
      if (!Object.prototype.hasOwnProperty.call(panes, k)) continue;
      panes[k].hidden = k !== name;
    }
    for (var j = 0; j < tabs.length; j++) {
      var on = tabs[j].getAttribute('data-tab') === name;
      tabs[j].setAttribute('aria-selected', on ? 'true' : 'false');
    }
    app.expandPanel();
    refresh();
  }

  // ------------------------------------------------------------- field kit

  function makeField(pane, id, labelText, opts) {
    var o = opts || {};
    var input = h(o.type === 'textarea' ? 'textarea' : o.type === 'select' ? 'select' : 'input', {
      id: id,
      class: 'ed-input'
    });
    if (o.type === 'select') {
      for (var i = 0; i < o.options.length; i++) {
        input.appendChild(h('option', { value: o.options[i].value, text: o.options[i].label }));
      }
    } else if (o.type !== 'textarea') {
      input.setAttribute('type', o.type || 'number');
      if (o.type === 'checkbox') input.className = '';
      if (o.step != null) input.setAttribute('step', o.step);
      if (o.min != null) input.setAttribute('min', o.min);
      if (o.max != null) input.setAttribute('max', o.max);
      if ((o.type || 'number') === 'number') input.setAttribute('inputmode', o.step === 'any' ? 'decimal' : 'numeric');
    }

    var read = function () {
      if (o.type === 'checkbox') return input.checked;
      if ((o.type || 'number') === 'number') {
        var n = parseFloat(input.value);
        return isFinite(n) ? n : 0;
      }
      return input.value;
    };
    var write = function (v) {
      if (o.type === 'checkbox') input.checked = !!v;
      else input.value = v == null ? '' : String(v);
    };

    var commitTimer = null;
    var apply = function (final) {
      o.set(read());
      app.onLiveEdit();
      if (commitTimer) clearTimeout(commitTimer);
      if (final) app.commit('Edit ' + labelText);
      else commitTimer = setTimeout(function () { app.commit('Edit ' + labelText); }, 400);
    };
    input.addEventListener('input', function () { apply(false); });
    input.addEventListener('change', function () { apply(true); });

    write(o.get());
    fields[pane].push({ id: id, el: input, sync: function () {
      if (document.activeElement === input) return;
      write(o.get());
    } });

    if (o.type === 'checkbox') {
      return h('label', { class: 'ed-check', for: id }, [input, labelText]);
    }
    return h('label', { class: 'ed-field', for: id }, [h('span', { text: labelText }), input]);
  }

  function syncFields(pane) {
    var list = fields[pane];
    for (var i = 0; i < list.length; i++) list[i].sync();
  }

  function btn(text, onClick, cls) {
    return h('button', { class: 'ed-btn ' + (cls || ''), type: 'button', text: text, onclick: onClick });
  }

  // ------------------------------------------------------------- Palette

  var PALETTE = [
    { group: 'Mission', items: [
      { tool: 'ship', label: 'Ship', color: '#4fe3d0' },
      { tool: 'target', label: 'Target', color: '#ffb347' },
      { tool: 'waypoint', label: 'Waypoint', color: '#ffce7a' }
    ] },
    { group: 'Terrain', items: [
      { tool: 'obstacle-circle', label: 'Rock ●', color: '#98a2b3' },
      { tool: 'obstacle-rect', label: 'Wall ▭', color: '#98a2b3' },
      { tool: 'obstacle-poly', label: 'Ridge ⬟', color: '#98a2b3' },
      { tool: 'belt', label: 'Belt brush', color: '#b3a08c' }
    ] },
    { group: 'Movers', items: [
      { tool: 'asteroid', label: 'Asteroid →', color: '#b3a08c' },
      { tool: 'asteroid-patrol', label: 'Asteroid ↻', color: '#b3a08c' },
      { tool: 'drone', label: 'Drone', color: '#e05ce0' },
      { tool: 'hunter', label: 'Hunter', color: '#ff4d4d' },
      { tool: 'ore', label: 'Ore', color: '#f0c060' },
      { tool: 'oreReceiver', label: 'Ore depot', color: '#f0c060' }
    ] },
    { group: 'Field', items: [
      { tool: 'well', label: 'Fixed well', color: '#9b6cff' },
      { tool: 'repulsor', label: 'Repulsor', color: '#ff9d4d' },
      { tool: 'wormhole', label: 'Wormhole', color: '#7fd8ff' }
    ] },
    { group: 'Placement rules', items: [
      { tool: 'deadzone-circle', label: 'Dead ●', color: '#ff6b6b' },
      { tool: 'deadzone-rect', label: 'Dead ▭', color: '#ff6b6b' },
      { tool: 'deadzone-poly', label: 'Dead ⬟', color: '#ff6b6b' },
      { tool: 'allowed-circle', label: 'Allowed ●', color: '#7cf6b0' },
      { tool: 'allowed-rect', label: 'Allowed ▭', color: '#7cf6b0' },
      { tool: 'allowed-poly', label: 'Allowed ⬟', color: '#7cf6b0' }
    ] }
  ];

  function buildPalette() {
    var pane = panes.palette;
    clear(pane);
    fields.palette = [];
    pane.appendChild(h('p', { class: 'ed-note', text: 'Tap a tool, then tap the board. Rect and circle tools can also be dragged out. Drag empty space to pan; pinch or scroll to zoom.' }));

    pane.appendChild(h('div', { class: 'ed-row' }, [
      h('button', {
        id: 'pal-select', class: 'ed-pal', type: 'button', style: 'flex:1',
        'aria-pressed': app.tool === 'select' ? 'true' : 'false',
        onclick: function () { app.setTool('select'); }
      }, [h('span', { class: 'ed-swatch', style: 'background:#4fe3d0' }), 'Select / move']),
      h('label', { class: 'ed-check', for: 'pal-sticky' }, [
        h('input', {
          type: 'checkbox', id: 'pal-sticky',
          onchange: function (e) { app.stickyTool = e.target.checked; }
        }),
        'Keep tool'
      ])
    ]));
    var sticky = document.getElementById('pal-sticky');
    if (sticky) sticky.checked = !!app.stickyTool;

    pane.appendChild(h('label', { class: 'ed-check', for: 'pal-multi' }, [
      h('input', {
        type: 'checkbox', id: 'pal-multi',
        onchange: function (e) { app.multiSelect = e.target.checked; }
      }),
      'Multi-select (tap adds)'
    ]));
    var multi = document.getElementById('pal-multi');
    if (multi) multi.checked = !!app.multiSelect;

    for (var g = 0; g < PALETTE.length; g++) {
      pane.appendChild(h('h3', { class: 'ed-h', text: PALETTE[g].group }));
      var grid = h('div', { class: 'ed-grid' });
      for (var i = 0; i < PALETTE[g].items.length; i++) {
        (function (item) {
          grid.appendChild(h('button', {
            id: 'pal-' + item.tool,
            class: 'ed-pal',
            type: 'button',
            'aria-pressed': app.tool === item.tool ? 'true' : 'false',
            onclick: function () { app.setTool(item.tool); }
          }, [h('span', { class: 'ed-swatch', style: 'background:' + item.color }), item.label]));
        })(PALETTE[g].items[i]);
      }
      pane.appendChild(grid);
    }

    if (app.tool === 'belt') pane.appendChild(buildBeltSettings());
  }

  function buildBeltSettings() {
    var s = app.beltSettings;
    var box = h('div', {}, [h('h3', { class: 'ed-h', text: 'Belt brush' })]);
    var grid = h('div', { class: 'ed-fields' });
    grid.appendChild(makeField('palette', 'belt-kind', 'Kind', {
      type: 'select',
      options: [{ value: 'obstacle', label: 'Static rock' }, { value: 'asteroid', label: 'Drifting' }],
      get: function () { return s.kind; },
      set: function (v) { s.kind = v; }
    }));
    grid.appendChild(makeField('palette', 'belt-width', 'Width', {
      step: '1', min: '10', get: function () { return s.width; }, set: function (v) { s.width = v; }
    }));
    grid.appendChild(makeField('palette', 'belt-density', 'Density', {
      step: '0.1', min: '0.1', get: function () { return s.density; }, set: function (v) { s.density = v; }
    }));
    grid.appendChild(makeField('palette', 'belt-rmin', 'Min radius', {
      step: '1', min: '2', get: function () { return s.rMin; }, set: function (v) { s.rMin = v; }
    }));
    grid.appendChild(makeField('palette', 'belt-rmax', 'Max radius', {
      step: '1', min: '2', get: function () { return s.rMax; }, set: function (v) { s.rMax = v; }
    }));
    grid.appendChild(makeField('palette', 'belt-seed', 'Seed', {
      step: '1', get: function () { return s.seed; }, set: function (v) { s.seed = Math.round(v); }
    }));
    grid.appendChild(makeField('palette', 'belt-vx', 'Drift vx', {
      step: '1', get: function () { return s.vx; }, set: function (v) { s.vx = v; }
    }));
    grid.appendChild(makeField('palette', 'belt-vy', 'Drift vy', {
      step: '1', get: function () { return s.vy; }, set: function (v) { s.vy = v; }
    }));
    box.appendChild(grid);
    box.appendChild(h('p', { class: 'ed-note', text: 'Drag a stroke across the board; the rocks are a pure function of the stroke and the seed, so a belt can be re-rolled from Inspect.' }));
    return box;
  }

  // ------------------------------------------------------------- Inspect

  function selectionSignature() {
    var lv = app.level();
    var sel = app.sel;
    var parts = [];
    for (var i = 0; i < sel.length; i++) {
      var s = sel[i];
      var extra = '';
      if (s.kind === 'fixture') {
        var f = (lv.fixtures || [])[s.index];
        extra = f ? f.type + ':' + (f.shape || '') + ':' + (f.path ? 'path' : '') : 'gone';
      } else if (s.kind === 'belt') {
        extra = s.beltId;
      } else if (s.kind === 'target') {
        extra = lv.target && lv.target.path ? 'path' : 'fixed';
      }
      parts.push(s.kind + '#' + s.index + '#' + extra);
    }
    return parts.join('|');
  }

  function buildInspect() {
    var pane = panes.inspect;
    clear(pane);
    fields.inspect = [];
    var lv = app.level();
    var sel = app.sel;

    if (!sel.length) {
      pane.appendChild(h('p', { class: 'ed-note', text: 'Nothing selected. Tap something on the board — a placed object is selected straight away, so its numbers are here the moment it lands.' }));
      return;
    }
    if (sel.length > 1) {
      pane.appendChild(h('p', { class: 'ed-note', text: sel.length + ' objects selected. Drag to move them together.' }));
      pane.appendChild(h('div', { class: 'ed-row' }, [
        btn('Duplicate', function () { app.duplicateSelection(); }),
        btn('Delete', function () { app.deleteSelection(); }, 'ed-btn-danger')
      ]));
      return;
    }

    var ref = sel[0];
    if (ref.kind === 'ship') return buildShipInspect(pane, lv);
    if (ref.kind === 'target') return buildTargetInspect(pane, lv);
    if (ref.kind === 'solution') return buildSolutionInspect(pane, lv, ref.index);
    if (ref.kind === 'belt') return buildBeltInspect(pane, lv, ref.beltId);
    return buildFixtureInspect(pane, lv, ref.index);
  }

  function buildShipInspect(pane, lv) {
    pane.appendChild(h('h3', { class: 'ed-h', text: 'Ship' }));
    var grid = h('div', { class: 'ed-fields' }, [
      makeField('inspect', 'insp-x', 'x', { step: '1', get: function () { return round(lv.ship.x); }, set: function (v) { lv.ship.x = v; } }),
      makeField('inspect', 'insp-y', 'y', { step: '1', get: function () { return round(lv.ship.y); }, set: function (v) { lv.ship.y = v; } }),
      makeField('inspect', 'insp-vx', 'vx', { step: '1', get: function () { return round(lv.ship.vx || 0); }, set: function (v) { lv.ship.vx = v; } }),
      makeField('inspect', 'insp-vy', 'vy', { step: '1', get: function () { return round(lv.ship.vy || 0); }, set: function (v) { lv.ship.vy = v; } })
    ]);
    pane.appendChild(grid);
    pane.appendChild(h('p', { class: 'ed-note', text: 'Speed ' + Math.round(Math.hypot(lv.ship.vx || 0, lv.ship.vy || 0)) + ' u/s. Drag the arrow tip on the board to aim it.' }));
  }

  function buildTargetInspect(pane, lv) {
    pane.appendChild(h('h3', { class: 'ed-h', text: 'Target' }));
    var grid = h('div', { class: 'ed-fields' }, [
      makeField('inspect', 'insp-x', 'x', { step: '1', get: function () { return round(lv.target.x); }, set: function (v) { lv.target.x = v; } }),
      makeField('inspect', 'insp-y', 'y', { step: '1', get: function () { return round(lv.target.y); }, set: function (v) { lv.target.y = v; } }),
      makeField('inspect', 'insp-r', 'radius', { step: '1', min: '6', get: function () { return round(lv.target.r); }, set: function (v) { lv.target.r = Math.max(6, v); } })
    ]);
    pane.appendChild(grid);

    if (lv.target.path) {
      var pgrid = h('div', { class: 'ed-fields' }, [
        makeField('inspect', 'insp-speed', 'patrol speed', { step: '1', min: '0', get: function () { return round(lv.target.speed || 60); }, set: function (v) { lv.target.speed = v; } })
      ]);
      pane.appendChild(h('h3', { class: 'ed-h', text: 'Patrol' }));
      pane.appendChild(pgrid);
      pane.appendChild(makeField('inspect', 'insp-loop', 'loop the path', {
        type: 'checkbox',
        get: function () { return lv.target.loop !== false; },
        set: function (v) { lv.target.loop = !!v; }
      }));
      pane.appendChild(h('p', { class: 'ed-note', text: lv.target.path.length + ' path points. Drag the square handles; tap a round midpoint handle to add one.' }));
      pane.appendChild(btn('Make target static', function () {
        delete lv.target.path;
        delete lv.target.speed;
        delete lv.target.loop;
        app.commit('Static target');
        refresh();
      }, 'ed-btn-danger'));
    } else {
      pane.appendChild(btn('Make target move', function () {
        lv.target.path = [
          { x: Math.round(lv.target.x - 140), y: Math.round(lv.target.y) },
          { x: Math.round(lv.target.x + 140), y: Math.round(lv.target.y) }
        ];
        lv.target.speed = 60;
        lv.target.loop = true;
        app.commit('Moving target');
        refresh();
      }));
    }
  }

  function buildSolutionInspect(pane, lv, index) {
    var w = (lv.solution || [])[index];
    if (!w) return;
    pane.appendChild(h('h3', { class: 'ed-h', text: 'Solution well ' + (index + 1) }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeField('inspect', 'insp-x', 'x', { step: '1', get: function () { return round(w.x); }, set: function (v) { w.x = v; } }),
      makeField('inspect', 'insp-y', 'y', { step: '1', get: function () { return round(w.y); }, set: function (v) { w.y = v; } }),
      makeField('inspect', 'insp-charges', 'charges', { step: '1', min: '1', get: function () { return w.charges; }, set: function (v) { w.charges = Math.max(1, Math.round(v)); } })
    ]));
    pane.appendChild(btn('Remove this well', function () {
      app.confirm('Remove solution well ' + (index + 1) + '?').then(function (yes) {
        if (!yes) return;
        lv.solution.splice(index, 1);
        app.setSel([]);
        app.commit('Remove solution well');
        refresh();
      });
    }, 'ed-btn-danger'));
  }

  function buildBeltInspect(pane, lv, beltId) {
    var belts = (lv.editor && lv.editor.belts) || [];
    var belt = null;
    for (var i = 0; i < belts.length; i++) if (belts[i].id === beltId) belt = belts[i];
    if (!belt) {
      pane.appendChild(h('p', { class: 'ed-note', text: 'That belt is gone.' }));
      return;
    }
    pane.appendChild(h('h3', { class: 'ed-h', text: 'Belt ' + belt.id + ' (' + (belt.ids || []).length + ' rocks)' }));
    var apply = function () { T.applyBelt(lv, belt); app.commit('Re-roll belt'); refresh(); };
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeField('inspect', 'insp-belt-width', 'width', { step: '1', min: '10', get: function () { return belt.width; }, set: function (v) { belt.width = v; } }),
      makeField('inspect', 'insp-belt-density', 'density', { step: '0.1', min: '0.1', get: function () { return belt.density; }, set: function (v) { belt.density = v; } }),
      makeField('inspect', 'insp-belt-rmin', 'min radius', { step: '1', min: '2', get: function () { return belt.rMin; }, set: function (v) { belt.rMin = v; } }),
      makeField('inspect', 'insp-belt-rmax', 'max radius', { step: '1', min: '2', get: function () { return belt.rMax; }, set: function (v) { belt.rMax = v; } }),
      makeField('inspect', 'insp-belt-seed', 'seed', { step: '1', get: function () { return belt.seed; }, set: function (v) { belt.seed = Math.round(v); } })
    ]));
    pane.appendChild(h('div', { class: 'ed-row' }, [
      btn('Apply', apply),
      btn('Re-roll', function () { belt.seed = (belt.seed || 0) + 1; apply(); }),
      btn('Delete belt', function () {
        app.confirm('Delete belt ' + belt.id + ' and its ' + (belt.ids || []).length + ' rocks?').then(function (yes) {
          if (!yes) return;
          T.removeBelt(lv, belt.id);
          app.setSel([]);
          app.commit('Delete belt');
          refresh();
        });
      }, 'ed-btn-danger')
    ]));
  }

  function buildFixtureInspect(pane, lv, index) {
    var f = (lv.fixtures || [])[index];
    if (!f) {
      pane.appendChild(h('p', { class: 'ed-note', text: 'That object is gone.' }));
      return;
    }
    pane.appendChild(h('h3', { class: 'ed-h', text: f.type + (f.shape ? ' · ' + f.shape : '') }));
    var grid = h('div', { class: 'ed-fields' });
    grid.appendChild(makeField('inspect', 'insp-id', 'id', {
      type: 'text', get: function () { return f.id || ''; }, set: function (v) { f.id = v; }
    }));

    if (f.type === 'wormhole') {
      grid.appendChild(makeField('inspect', 'insp-ax', 'mouth A x', { step: '1', get: function () { return round(f.a.x); }, set: function (v) { f.a.x = v; } }));
      grid.appendChild(makeField('inspect', 'insp-ay', 'mouth A y', { step: '1', get: function () { return round(f.a.y); }, set: function (v) { f.a.y = v; } }));
      grid.appendChild(makeField('inspect', 'insp-angle-a', 'A exit °', {
        step: '1',
        get: function () { return Math.round(((f.a.angle || 0) * 180 / Math.PI) * 10) / 10; },
        set: function (v) { f.a.angle = v * Math.PI / 180; }
      }));
      grid.appendChild(makeField('inspect', 'insp-bx', 'mouth B x', { step: '1', get: function () { return round(f.b.x); }, set: function (v) { f.b.x = v; } }));
      grid.appendChild(makeField('inspect', 'insp-by', 'mouth B y', { step: '1', get: function () { return round(f.b.y); }, set: function (v) { f.b.y = v; } }));
      grid.appendChild(makeField('inspect', 'insp-angle-b', 'B exit °', {
        step: '1',
        get: function () { return Math.round(((f.b.angle || 0) * 180 / Math.PI) * 10) / 10; },
        set: function (v) { f.b.angle = v * Math.PI / 180; }
      }));
      grid.appendChild(makeField('inspect', 'insp-r', 'mouth radius', { step: '1', min: '6', get: function () { return round(f.r != null ? f.r : 26); }, set: function (v) { f.r = Math.max(6, v); } }));
      grid.appendChild(makeField('inspect', 'insp-color', 'pair colour', { step: '1', min: '0', max: '5', get: function () { return f.color || 0; }, set: function (v) { f.color = Math.max(0, Math.min(5, Math.round(v))); } }));
      pane.appendChild(grid);
      pane.appendChild(makeField('inspect', 'insp-oneway', 'one way (A → B only)', {
        type: 'checkbox', get: function () { return !!f.oneWay; }, set: function (v) { f.oneWay = !!v; }
      }));
    } else {
      if (f.shape === 'rect') {
        grid.appendChild(makeField('inspect', 'insp-x', 'x (left)', { step: '1', get: function () { return round(f.x); }, set: function (v) { f.x = v; } }));
        grid.appendChild(makeField('inspect', 'insp-y', 'y (top)', { step: '1', get: function () { return round(f.y); }, set: function (v) { f.y = v; } }));
        grid.appendChild(makeField('inspect', 'insp-w', 'width', { step: '1', min: '4', get: function () { return round(f.w); }, set: function (v) { f.w = Math.max(4, v); } }));
        grid.appendChild(makeField('inspect', 'insp-h', 'height', { step: '1', min: '4', get: function () { return round(f.h); }, set: function (v) { f.h = Math.max(4, v); } }));
      } else if (f.shape === 'poly') {
        pane.appendChild(h('p', { class: 'ed-note', text: (f.points || []).length + ' points. Drag the square handles to shape it; tap a round midpoint handle to add a point.' }));
      } else if (f.path) {
        grid.appendChild(makeField('inspect', 'insp-r', 'radius', { step: '1', min: '2', get: function () { return round(f.r); }, set: function (v) { f.r = Math.max(2, v); } }));
        grid.appendChild(makeField('inspect', 'insp-speed', 'patrol speed', { step: '1', min: '0', get: function () { return round(f.speed != null ? f.speed : 60); }, set: function (v) { f.speed = v; } }));
        grid.appendChild(makeField('inspect', 'insp-patht', 'path start t', { step: '0.1', get: function () { return round(f.pathT || 0); }, set: function (v) { f.pathT = v; } }));
      } else {
        grid.appendChild(makeField('inspect', 'insp-x', 'x', { step: '1', get: function () { return round(f.x); }, set: function (v) { f.x = v; } }));
        grid.appendChild(makeField('inspect', 'insp-y', 'y', { step: '1', get: function () { return round(f.y); }, set: function (v) { f.y = v; } }));
        if (f.r != null) {
          grid.appendChild(makeField('inspect', 'insp-r', 'radius', { step: '1', min: '2', get: function () { return round(f.r); }, set: function (v) { f.r = Math.max(2, v); } }));
        }
      }
      if (f.vx != null || f.vy != null) {
        grid.appendChild(makeField('inspect', 'insp-vx', 'vx', { step: '1', get: function () { return round(f.vx || 0); }, set: function (v) { f.vx = v; } }));
        grid.appendChild(makeField('inspect', 'insp-vy', 'vy', { step: '1', get: function () { return round(f.vy || 0); }, set: function (v) { f.vy = v; } }));
      }
      if (f.type === 'well' || f.type === 'repulsor') {
        grid.appendChild(makeField('inspect', 'insp-charges', 'charges', {
          step: '1', min: '1', max: '5',
          get: function () { return f.charges || 1; },
          set: function (v) { f.charges = Math.max(1, Math.min(5, Math.round(v))); }
        }));
      }
      if (f.type === 'waypoint') {
        grid.appendChild(makeField('inspect', 'insp-order', 'order', {
          step: '1', min: '1',
          get: function () { return f.order || 1; },
          set: function (v) { f.order = Math.max(1, Math.round(v)); }
        }));
      }
      if (f.type === 'hunter') {
        grid.appendChild(makeField('inspect', 'insp-accel', 'accel', { step: '1', min: '0', get: function () { return round(f.accel != null ? f.accel : 60); }, set: function (v) { f.accel = v; } }));
        grid.appendChild(makeField('inspect', 'insp-maxspeed', 'max speed', { step: '1', min: '0', get: function () { return round(f.maxSpeed != null ? f.maxSpeed : 140); }, set: function (v) { f.maxSpeed = v; } }));
      }
      pane.appendChild(grid);

      if (f.path) {
        pane.appendChild(makeField('inspect', 'insp-loop', 'loop the path', {
          type: 'checkbox', get: function () { return f.loop !== false; }, set: function (v) { f.loop = !!v; }
        }));
      }
      if (f.type !== 'deadZone' && f.type !== 'allowedZone' && f.type !== 'well' && f.type !== 'repulsor' && f.type !== 'waypoint') {
        pane.appendChild(makeField('inspect', 'insp-immune', 'immune to wells', {
          type: 'checkbox', get: function () { return !!f.immune; }, set: function (v) { if (v) f.immune = true; else delete f.immune; }
        }));
      }
    }

    pane.appendChild(h('div', { class: 'ed-row' }, [
      btn('Duplicate', function () { app.duplicateSelection(); }),
      btn('Delete', function () { app.deleteSelection(); }, 'ed-btn-danger')
    ]));
  }

  // --------------------------------------------------------------- Level

  function buildLevel() {
    var pane = panes.level;
    clear(pane);
    fields.level = [];
    var lv = app.level();

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Level' }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeField('level', 'lvl-id', 'id', { type: 'text', get: function () { return lv.id; }, set: function (v) { lv.id = v; } }),
      makeField('level', 'lvl-name', 'name', { type: 'text', get: function () { return lv.name; }, set: function (v) { lv.name = v; app.refreshCrumbs(); } })
    ]));
    pane.appendChild(makeField('level', 'lvl-optional', 'optional (★ challenge)', {
      type: 'checkbox', get: function () { return !!lv.optional; }, set: function (v) { lv.optional = !!v; }
    }));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Board' }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeField('level', 'lvl-bounds-w', 'bounds w', {
        step: '10', min: '100',
        get: function () { return lv.bounds.w; },
        set: function (v) { lv.bounds.w = Math.max(100, v); app.fitView(); }
      }),
      makeField('level', 'lvl-bounds-h', 'bounds h', {
        step: '10', min: '100',
        get: function () { return lv.bounds.h; },
        set: function (v) { lv.bounds.h = Math.max(100, v); app.fitView(); }
      })
    ]));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Rules' }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeField('level', 'lvl-charges', 'charge budget', { step: '1', min: '0', get: function () { return lv.charges; }, set: function (v) { lv.charges = Math.max(0, Math.round(v)); } }),
      makeField('level', 'lvl-stack', 'stack limit', { step: '1', min: '1', get: function () { return lv.stackLimit; }, set: function (v) { lv.stackLimit = Math.max(1, Math.round(v)); } }),
      makeField('level', 'lvl-preview', 'preview seconds', { step: '1', min: '0', get: function () { return lv.previewSeconds; }, set: function (v) { lv.previewSeconds = Math.max(0, v); } }),
      makeField('level', 'lvl-mintol', 'min tolerance', {
        step: '1', min: '0',
        get: function () { return lv.minTolerance != null ? lv.minTolerance : ''; },
        set: function (v) { if (v > 0) lv.minTolerance = Math.round(v); else delete lv.minTolerance; }
      })
    ]));
    pane.appendChild(makeField('level', 'lvl-bodypreview', 'show other bodies’ predicted paths', {
      type: 'checkbox', get: function () { return lv.showBodyPreview !== false; }, set: function (v) { lv.showBodyPreview = !!v; }
    }));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Notes' }));
    pane.appendChild(makeField('level', 'lvl-notes', 'designer notes (not shown in game)', {
      type: 'textarea', get: function () { return lv.notes || ''; }, set: function (v) { if (v) lv.notes = v; else delete lv.notes; }
    }));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Solution' }));
    var sol = lv.solution || [];
    pane.appendChild(h('p', { class: 'ed-note', text: sol.length ? sol.length + ' well(s), ' + sol.reduce(function (a, w) { return a + w.charges; }, 0) + ' charges. Tap one on the board to edit it.' : 'No authored solution yet. Add wells here or take one from the Analyse tab.' }));
    pane.appendChild(h('div', { class: 'ed-row' }, [
      btn('Add solution well', function () {
        if (!lv.solution) lv.solution = [];
        lv.solution.push({ x: Math.round(lv.bounds.w / 2), y: Math.round(lv.bounds.h / 2), charges: 1 });
        app.setSel([{ kind: 'solution', index: lv.solution.length - 1 }]);
        app.commit('Add solution well');
        refresh();
      }),
      btn('Clear solution', function () {
        app.confirm('Remove all solution wells?').then(function (yes) {
          if (!yes) return;
          lv.solution = [];
          app.setSel([]);
          app.commit('Clear solution');
          refresh();
        });
      }, 'ed-btn-danger')
    ]));
  }

  // ------------------------------------------------------------ Tutorial

  var WHEN_OPTIONS = [
    { value: 'start', label: 'start' },
    { value: 'firstWell', label: 'first well' },
    { value: 'launch', label: 'launch' },
    { value: 'win', label: 'win' },
    { value: 'fail', label: 'fail' }
  ];
  var MARKER_OPTIONS = [
    { value: 'none', label: 'no marker' },
    { value: 'well', label: 'well (x, y, charges)' },
    { value: 'point', label: 'point (x, y)' },
    { value: 'ui', label: 'UI button' }
  ];

  function buildTutorial() {
    var pane = panes.tutorial;
    clear(pane);
    fields.tutorial = [];
    var lv = app.level();
    if (!lv.tutorial) lv.tutorial = { steps: [] };
    var steps = lv.tutorial.steps;

    pane.appendChild(h('p', { class: 'ed-note', text: 'Tutorial steps replace the old radio + hint pair. Each step fires once at its moment; a marker draws a pointer on the board or highlights a button.' }));
    pane.appendChild(h('label', { class: 'ed-check', for: 'tut-preview' }, [
      h('input', {
        type: 'checkbox', id: 'tut-preview',
        onchange: function (e) { app.tutorialPreview = e.target.checked; app.onLiveEdit(); }
      }),
      'Preview markers on the board'
    ]));
    var prev = document.getElementById('tut-preview');
    if (prev) prev.checked = !!app.tutorialPreview;

    var list = h('div', { class: 'ed-list', id: 'tut-steps' });
    for (var i = 0; i < steps.length; i++) list.appendChild(buildStep(lv, steps, i));
    pane.appendChild(list);

    pane.appendChild(h('div', { class: 'ed-row' }, [
      h('button', {
        id: 'tut-add', class: 'ed-btn', type: 'button', text: 'Add step',
        onclick: function () {
          steps.push({ when: 'start', text: '', once: true });
          app.commit('Add tutorial step');
          refresh();
        }
      }),
      steps.length ? btn('Remove all', function () {
        app.confirm('Remove all ' + steps.length + ' tutorial steps?').then(function (yes) {
          if (!yes) return;
          lv.tutorial.steps = [];
          app.commit('Clear tutorial');
          refresh();
        });
      }, 'ed-btn-danger') : null
    ]));
  }

  function buildStep(lv, steps, i) {
    var step = steps[i];
    var box = h('div', { class: 'ed-item', style: 'flex-direction:column;align-items:stretch;gap:8px' });
    box.appendChild(h('div', { class: 'ed-row' }, [
      h('span', { class: 'ed-item-sub', text: 'Step ' + (i + 1) }),
      h('span', { style: 'flex:1' }),
      h('button', { class: 'ed-btn ed-btn-sm', type: 'button', text: '▲', 'aria-label': 'Move step up', onclick: function () { T.moveInArray(steps, i, i - 1); app.commit('Reorder steps'); refresh(); } }),
      h('button', { class: 'ed-btn ed-btn-sm', type: 'button', text: '▼', 'aria-label': 'Move step down', onclick: function () { T.moveInArray(steps, i, i + 1); app.commit('Reorder steps'); refresh(); } }),
      h('button', {
        class: 'ed-btn ed-btn-sm ed-btn-danger', type: 'button', text: '✕', 'aria-label': 'Delete step',
        onclick: function () {
          app.confirm('Delete tutorial step ' + (i + 1) + '?').then(function (yes) {
            if (!yes) return;
            steps.splice(i, 1);
            app.commit('Delete tutorial step');
            refresh();
          });
        }
      })
    ]));
    box.appendChild(makeField('tutorial', 'tut-when-' + i, 'when', {
      type: 'select', options: WHEN_OPTIONS,
      get: function () { return step.when; },
      set: function (v) { step.when = v; }
    }));
    box.appendChild(makeField('tutorial', 'tut-text-' + i, 'text', {
      type: 'textarea',
      get: function () { return step.text || ''; },
      set: function (v) { step.text = v; }
    }));
    box.appendChild(makeField('tutorial', 'tut-marker-' + i, 'marker', {
      type: 'select', options: MARKER_OPTIONS,
      get: function () { return step.marker ? step.marker.kind : 'none'; },
      set: function (v) {
        if (v === 'none') delete step.marker;
        else if (v === 'ui') step.marker = { kind: 'ui', target: 'launch' };
        else if (v === 'well') step.marker = { kind: 'well', x: Math.round(lv.bounds.w / 2), y: Math.round(lv.bounds.h / 2), charges: 1 };
        else step.marker = { kind: 'point', x: Math.round(lv.bounds.w / 2), y: Math.round(lv.bounds.h / 2) };
        refresh();
      }
    }));
    if (step.marker && step.marker.kind === 'ui') {
      box.appendChild(makeField('tutorial', 'tut-uitarget-' + i, 'button', {
        type: 'select',
        options: [{ value: 'launch', label: 'Launch' }, { value: 'reset', label: 'Reset' }, { value: 'charges', label: 'Charges' }],
        get: function () { return step.marker.target || 'launch'; },
        set: function (v) { step.marker.target = v; }
      }));
    } else if (step.marker) {
      var grid = h('div', { class: 'ed-fields' }, [
        makeField('tutorial', 'tut-mx-' + i, 'marker x', { step: '1', get: function () { return round(step.marker.x); }, set: function (v) { step.marker.x = v; } }),
        makeField('tutorial', 'tut-my-' + i, 'marker y', { step: '1', get: function () { return round(step.marker.y); }, set: function (v) { step.marker.y = v; } })
      ]);
      if (step.marker.kind === 'well') {
        grid.appendChild(makeField('tutorial', 'tut-mc-' + i, 'charges', {
          step: '1', min: '1',
          get: function () { return step.marker.charges || 1; },
          set: function (v) { step.marker.charges = Math.max(1, Math.round(v)); }
        }));
      }
      box.appendChild(grid);
      box.appendChild(h('button', {
        id: 'tut-pick-' + i, class: 'ed-btn', type: 'button', text: 'Pick position on the board',
        onclick: function () {
          app.pickPosition('Tap the board to place the marker for step ' + (i + 1), function (p) {
            step.marker.x = Math.round(p.x);
            step.marker.y = Math.round(p.y);
            app.tutorialPreview = true;
            app.commit('Move marker');
            refresh();
          });
        }
      }));
    }
    box.appendChild(makeField('tutorial', 'tut-once-' + i, 'show once only', {
      type: 'checkbox',
      get: function () { return step.once !== false; },
      set: function (v) { step.once = !!v; }
    }));
    return box;
  }

  // ------------------------------------------------------------- Analyse

  function buildAnalyse() {
    var pane = panes.analyse;
    clear(pane);
    fields.analyse = [];
    var lv = app.level();
    var s = app.analyseSettings;

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Hot zone' }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeFieldNoCommit('an-charges', 'charges', s, 'charges', { step: '1', min: '1' }),
      makeFieldNoCommit('an-step', 'lattice step', s, 'step', { step: '2', min: '8' })
    ]));
    pane.appendChild(h('div', { class: 'ed-row' }, [
      h('button', { id: 'an-hotzone', class: 'ed-btn ed-btn-go', type: 'button', text: 'Sweep', onclick: function () { app.analyse('hotzone'); } }),
      btn('Clear overlay', function () { app.clearOverlay(); })
    ]));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Solution finder' }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeFieldNoCommit('an-samples', 'samples', s, 'samples', { step: '100', min: '100' })
    ]));
    pane.appendChild(h('button', { id: 'an-solve', class: 'ed-btn ed-btn-go', type: 'button', text: 'Find solutions', onclick: function () { app.analyse('solve'); } }));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Tolerance & lint' }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeFieldNoCommit('an-floor', 'tolerance floor', s, 'floor', { step: '5', min: '0' })
    ]));
    pane.appendChild(h('div', { class: 'ed-row' }, [
      h('button', { id: 'an-tolerance', class: 'ed-btn ed-btn-go', type: 'button', text: 'Tolerance', onclick: function () { app.analyse('tolerance'); } }),
      h('button', { id: 'an-lint', class: 'ed-btn ed-btn-go', type: 'button', text: 'Lint', onclick: function () { app.analyse('lint'); } }),
      h('button', { id: 'an-cancel', class: 'ed-btn ed-btn-danger', type: 'button', text: 'Cancel', onclick: function () { app.cancelAnalyse(); } })
    ]));

    analyseBar = h('div', { class: 'ed-prog' }, [h('i', { id: 'an-bar' })]);
    pane.appendChild(analyseBar);
    analyseOut = h('div', { class: 'ed-out', id: 'an-out' });
    pane.appendChild(analyseOut);
    pane.appendChild(h('p', { class: 'ed-note', text: 'Analysis runs in a Web Worker on the real sim, so the board stays responsive. Big sweeps on a 900x1200 board take a few seconds — raise the lattice step to trade detail for speed.' }));
    if (app.analyseHtml) analyseOut.innerHTML = app.analyseHtml;
    if (app.analyseFamilies) renderFamilies(app.analyseFamilies);
  }

  // Analyse settings are UI state, not level data: no undo entry, no autosave.
  function makeFieldNoCommit(id, labelText, obj, key, opts) {
    var o = opts || {};
    var input = h('input', { id: id, class: 'ed-input', type: 'number', inputmode: 'numeric' });
    if (o.step) input.setAttribute('step', o.step);
    if (o.min != null) input.setAttribute('min', o.min);
    input.value = String(obj[key]);
    input.addEventListener('change', function () {
      var n = parseFloat(input.value);
      if (isFinite(n)) obj[key] = n;
    });
    return h('label', { class: 'ed-field', for: id }, [h('span', { text: labelText }), input]);
  }

  function renderFamilies(families) {
    if (!analyseOut) return;
    var box = h('div', {});
    for (var i = 0; i < families.length; i++) {
      (function (fam, idx) {
        var desc = fam.wells.map(function (w) { return '(' + w.x + ',' + w.y + ')×' + w.charges; }).join(' ');
        box.appendChild(h('div', { class: 'ed-family' }, [
          h('span', { text: '#' + (idx + 1) + ' · ' + fam.totalCharges + ' chg · ' + fam.count + ' hits · ' + desc }),
          h('button', {
            class: 'ed-btn ed-btn-sm', type: 'button', text: 'Show',
            onclick: function () { app.showFamily(fam); }
          }),
          h('button', {
            class: 'ed-btn ed-btn-sm ed-btn-go', type: 'button', text: 'Use',
            onclick: function () { app.useAsSolution(fam.wells); }
          })
        ]));
      })(families[i], i);
    }
    analyseOut.appendChild(box);
  }

  // ---------------------------------------------------------------- Pack

  function buildPack() {
    var pane = panes.pack;
    clear(pane);
    fields.pack = [];
    var pack = app.pack;
    var stage = app.stage();

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Pack' }));
    pane.appendChild(h('div', { class: 'ed-fields' }, [
      makeField('pack', 'pk-id', 'id', { type: 'text', get: function () { return pack.id; }, set: function (v) { pack.id = v; } }),
      makeField('pack', 'pk-name', 'name', { type: 'text', get: function () { return pack.name; }, set: function (v) { pack.name = v; } }),
      makeField('pack', 'pk-author', 'author', { type: 'text', get: function () { return pack.author || ''; }, set: function (v) { pack.author = v; } }),
      makeField('pack', 'pk-version', 'version', { step: '1', min: '1', get: function () { return pack.version || 1; }, set: function (v) { pack.version = Math.max(1, Math.round(v)); } })
    ]));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Stages' }));
    var stageList = h('div', { class: 'ed-list', id: 'pk-stages' });
    for (var i = 0; i < pack.stages.length; i++) stageList.appendChild(buildStageRow(pack, i));
    pane.appendChild(stageList);
    pane.appendChild(h('button', {
      id: 'pk-add-stage', class: 'ed-btn', type: 'button', text: 'Add stage',
      onclick: function () {
        pack.stages.push(T.newStage(pack.stages.length + 1));
        app.setStage(pack.stages.length - 1);
        app.commit('Add stage');
        refresh();
      }
    }));

    if (stage) {
      pane.appendChild(h('h3', { class: 'ed-h', text: 'Current stage' }));
      pane.appendChild(h('div', { class: 'ed-fields' }, [
        makeField('pack', 'pk-stage-id', 'stage id', { type: 'text', get: function () { return stage.id; }, set: function (v) { stage.id = v; } }),
        makeField('pack', 'pk-stage-title', 'title', { type: 'text', get: function () { return stage.title; }, set: function (v) { stage.title = v; app.refreshCrumbs(); } })
      ]));
      pane.appendChild(makeField('pack', 'pk-stage-blurb', 'blurb', {
        type: 'text', get: function () { return stage.blurb || ''; }, set: function (v) { stage.blurb = v; }
      }));

      pane.appendChild(h('h3', { class: 'ed-h', text: 'Levels in this stage' }));
      var levelList = h('div', { class: 'ed-list', id: 'pk-levels' });
      for (var j = 0; j < stage.levels.length; j++) levelList.appendChild(buildLevelRow(stage, j));
      pane.appendChild(levelList);
      pane.appendChild(h('button', {
        id: 'pk-new-level', class: 'ed-btn', type: 'button', text: 'New level',
        onclick: function () {
          var used = T.levelIds(pack);
          var lv = T.newLevel({ id: T.uniqueId('lvl-' + (stage.levels.length + 1), used) });
          lv.name = 'Level ' + (stage.levels.length + 1);
          stage.levels.push(lv);
          app.setLevel(stage.levels.length - 1);
          app.commit('New level');
          refresh();
        }
      }));
    }

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Export' }));
    pane.appendChild(h('div', { class: 'ed-row' }, [
      h('button', { id: 'pk-export-pack', class: 'ed-btn ed-btn-go', type: 'button', text: 'Export pack', onclick: function () { app.exportJSON('pack'); } }),
      h('button', { id: 'pk-export-level', class: 'ed-btn', type: 'button', text: 'Export level', onclick: function () { app.exportJSON('level'); } }),
      h('button', { id: 'pk-play', class: 'ed-btn', type: 'button', text: 'Play this pack', onclick: function () { app.playPack(); } })
    ]));
    pane.appendChild(h('textarea', { id: 'pk-export-out', class: 'ed-input', readonly: true, 'aria-label': 'Exported JSON' }));

    pane.appendChild(h('h3', { class: 'ed-h', text: 'Import' }));
    pane.appendChild(h('textarea', { id: 'pk-import-text', class: 'ed-input', placeholder: 'Paste pack or level JSON here', 'aria-label': 'JSON to import' }));
    pane.appendChild(h('div', { class: 'ed-row' }, [
      h('button', {
        id: 'pk-import-btn', class: 'ed-btn ed-btn-go', type: 'button', text: 'Import JSON',
        onclick: function () {
          var ta = document.getElementById('pk-import-text');
          app.importJSON(ta ? ta.value : '');
        }
      }),
      h('input', {
        id: 'pk-import-file', class: 'ed-input', type: 'file', accept: '.json,application/json',
        style: 'padding:8px',
        onchange: function (e) {
          var file = e.target.files && e.target.files[0];
          if (!file) return;
          var reader = new FileReader();
          reader.onload = function () { app.importJSON(String(reader.result)); };
          reader.readAsText(file);
        }
      })
    ]));
    pane.appendChild(h('p', { class: 'ed-note', text: 'A whole pack replaces the working pack. A single level is added to the current stage.' }));
  }

  function buildStageRow(pack, i) {
    var stage = pack.stages[i];
    return h('div', { class: 'ed-item' + (i === app.stageIndex ? ' current' : '') }, [
      h('button', {
        class: 'ed-item-name', type: 'button',
        text: stage.title + ' (' + (stage.levels || []).length + ')',
        onclick: function () { app.setStage(i); refresh(); }
      }),
      h('button', { class: 'ed-btn ed-btn-sm', type: 'button', text: '▲', 'aria-label': 'Move stage up', onclick: function () { T.moveInArray(pack.stages, i, i - 1); app.setStage(Math.max(0, i - 1)); app.commit('Reorder stages'); refresh(); } }),
      h('button', { class: 'ed-btn ed-btn-sm', type: 'button', text: '▼', 'aria-label': 'Move stage down', onclick: function () { T.moveInArray(pack.stages, i, i + 1); app.setStage(Math.min(pack.stages.length - 1, i + 1)); app.commit('Reorder stages'); refresh(); } }),
      h('button', {
        class: 'ed-btn ed-btn-sm ed-btn-danger', type: 'button', text: '✕', 'aria-label': 'Delete stage',
        onclick: function () {
          app.confirm('Delete stage "' + stage.title + '" and its ' + (stage.levels || []).length + ' level(s)?').then(function (yes) {
            if (!yes) return;
            if (pack.stages.length === 1) {
              app.toast('A pack needs at least one stage');
              return;
            }
            pack.stages.splice(i, 1);
            app.setStage(Math.min(app.stageIndex, pack.stages.length - 1));
            app.commit('Delete stage');
            refresh();
          });
        }
      })
    ]);
  }

  function buildLevelRow(stage, j) {
    var lv = stage.levels[j];
    return h('div', { class: 'ed-item' + (j === app.levelIndex ? ' current' : '') }, [
      h('button', {
        class: 'ed-item-name', type: 'button',
        text: (lv.optional ? '★ ' : '') + lv.name + ' · ' + lv.id,
        onclick: function () { app.setLevel(j); refresh(); }
      }),
      h('button', {
        class: 'ed-btn ed-btn-sm', type: 'button', text: lv.optional ? '★' : '☆', 'aria-label': 'Toggle optional',
        onclick: function () { lv.optional = !lv.optional; app.commit('Toggle optional'); refresh(); }
      }),
      h('button', { class: 'ed-btn ed-btn-sm', type: 'button', text: '▲', 'aria-label': 'Move level up', onclick: function () { T.moveInArray(stage.levels, j, j - 1); app.setLevel(Math.max(0, j - 1)); app.commit('Reorder levels'); refresh(); } }),
      h('button', { class: 'ed-btn ed-btn-sm', type: 'button', text: '▼', 'aria-label': 'Move level down', onclick: function () { T.moveInArray(stage.levels, j, j + 1); app.setLevel(Math.min(stage.levels.length - 1, j + 1)); app.commit('Reorder levels'); refresh(); } }),
      h('button', {
        class: 'ed-btn ed-btn-sm', type: 'button', text: '⧉', 'aria-label': 'Duplicate level',
        onclick: function () {
          var copy = T.cloneJSON(lv);
          copy.id = T.uniqueId(lv.id + '-copy', T.levelIds(app.pack));
          copy.name = lv.name + ' copy';
          stage.levels.splice(j + 1, 0, copy);
          app.setLevel(j + 1);
          app.commit('Duplicate level');
          refresh();
        }
      }),
      h('button', {
        class: 'ed-btn ed-btn-sm ed-btn-danger', type: 'button', text: '✕', 'aria-label': 'Delete level',
        onclick: function () {
          app.confirm('Delete level "' + lv.name + '"?').then(function (yes) {
            if (!yes) return;
            if (stage.levels.length === 1) {
              app.toast('A stage needs at least one level');
              return;
            }
            stage.levels.splice(j, 1);
            app.setLevel(Math.min(app.levelIndex, stage.levels.length - 1));
            app.commit('Delete level');
            refresh();
          });
        }
      })
    ]);
  }

  // -------------------------------------------------------------- refresh

  function refresh() {
    if (current === 'palette') { buildPalette(); return; }
    if (current === 'inspect') {
      var sig = selectionSignature();
      if (sig !== sigs.inspect) { sigs.inspect = sig; buildInspect(); }
      else syncFields('inspect');
      return;
    }
    if (current === 'level') {
      var lsig = app.stageIndex + '/' + app.levelIndex;
      if (lsig !== sigs.level) { sigs.level = lsig; buildLevel(); }
      else syncFields('level');
      return;
    }
    if (current === 'tutorial') {
      var lv = app.level();
      var tsig = app.stageIndex + '/' + app.levelIndex + '/' + ((lv.tutorial && lv.tutorial.steps) || []).length +
        '/' + ((lv.tutorial && lv.tutorial.steps) || []).map(function (s) { return s.marker ? s.marker.kind : '-'; }).join(',');
      if (tsig !== sigs.tutorial) { sigs.tutorial = tsig; buildTutorial(); }
      else syncFields('tutorial');
      return;
    }
    if (current === 'analyse') { if (!panes.analyse.firstChild) buildAnalyse(); return; }
    if (current === 'pack') {
      var psig = app.pack.stages.length + '/' + app.stageIndex + '/' + app.levelIndex + '/' +
        (app.stage() ? app.stage().levels.length : 0) + '/' +
        (app.stage() ? app.stage().levels.map(function (l) { return l.id + (l.optional ? '*' : ''); }).join(',') : '');
      if (psig !== sigs.pack) { sigs.pack = psig; buildPack(); }
      else syncFields('pack');
    }
  }

  /** Force a rebuild of every cached pane (after import / level switch). */
  function invalidate() {
    sigs = { inspect: '~', level: '~', tutorial: '~', pack: '~' };
    refresh();
  }

  function setProgress(value, note) {
    var bar = document.getElementById('an-bar');
    if (bar) bar.style.width = Math.round(Math.max(0, Math.min(1, value)) * 100) + '%';
    var out = document.getElementById('an-out');
    if (out && note) out.setAttribute('data-progress', note);
  }

  function setAnalyseOutput(html, families) {
    app.analyseHtml = html;
    app.analyseFamilies = families || null;
    var out = document.getElementById('an-out');
    if (!out) return;
    out.innerHTML = html;
    analyseOut = out;
    if (families) renderFamilies(families);
  }

  setTab('palette');

  return {
    refresh: refresh,
    invalidate: invalidate,
    setTab: setTab,
    currentTab: function () { return current; },
    setProgress: setProgress,
    setAnalyseOutput: setAnalyseOutput,
    rebuildAnalyse: buildAnalyse
  };
}
