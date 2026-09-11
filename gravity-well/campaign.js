// Gravity Well — campaign.js
// The built-in campaign, exposed in the phase-2 pack format. It is assembled at
// load time from levels.js (LEVELS + WORLDS) rather than duplicated, so the
// 47 authored levels stay the single source of truth: one world becomes one
// stage, in LEVELS order, and the level objects are referenced as-is.

import { PHYSICS_VERSION } from './sim.js';
import * as levelsModule from './levels.js';

var LEVELS = levelsModule.LEVELS || [];
var WORLDS = levelsModule.WORLDS || [];

export var CAMPAIGN_PACK_ID = 'campaign';

function worldMeta(phase) {
  for (var i = 0; i < WORLDS.length; i++) {
    if (WORLDS[i] && WORLDS[i].phase === phase) return WORLDS[i];
  }
  return null;
}

// Group LEVELS into stages by `phase`, preserving level order. A phase that is
// interrupted and resumed would produce two stages, which is what the ordering
// actually means, so no sorting or reordering happens here.
export function buildCampaignPack() {
  var stages = [];
  var current = null;
  var lastPhase = null;

  for (var i = 0; i < LEVELS.length; i++) {
    var lv = LEVELS[i];
    var phase = lv.phase;
    if (current === null || phase !== lastPhase) {
      var meta = worldMeta(phase);
      current = {
        id: 'w' + phase,
        title: meta && meta.title ? meta.title : 'World ' + phase,
        blurb: meta && meta.blurb ? meta.blurb : '',
        levels: []
      };
      stages.push(current);
      lastPhase = phase;
    }
    current.levels.push(lv);
  }

  return {
    format: 'gw-pack-1',
    physicsVersion: PHYSICS_VERSION,
    id: CAMPAIGN_PACK_ID,
    name: 'Gravity Well',
    author: '',
    version: 1,
    builtIn: true,
    stages: stages
  };
}

export const CAMPAIGN_PACK = buildCampaignPack();
