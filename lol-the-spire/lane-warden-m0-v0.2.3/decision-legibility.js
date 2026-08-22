(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const stateMap = {
    'NET PROGRESS': ['above', 'DMG > REGEN'],
    'NEAR REPL': ['near', 'DMG ≈ REGEN'],
    'BELOW REPL': ['below', 'REGEN > DMG'],
    'BREACH': ['broken', 'BREACH']
  };
  window.__LW_DECISION_LEGIBILITY__ = { build: 'M0-0.2.2', patch: 'DL-001', parametersChanged: false };

  function pctFromBastion(text) {
    const m = String(text || '').match(/B\s+(\d+)/);
    return m ? Number(m[1]) : (String(text).includes('OPEN') ? 0 : 100);
  }
  function selectedLane() {
    return document.querySelector('.lane.selected')?.dataset.lane || 'north';
  }
  function patchLane(id) {
    const pressure = $(`${id}Pressure`), guard = $(`${id}Guard`);
    if (!pressure || !guard) return 'below';
    const raw = pressure.textContent.trim();
    const mapped = stateMap[raw] || [pressure.dataset.guardState || 'below', raw];
    pressure.dataset.guardState = mapped[0];
    pressure.textContent = mapped[1];
    if (!guard.textContent.includes('OPEN')) {
      guard.textContent = guard.textContent.replace(/\s+[↓≈]$/, '');
      if (mapped[0] === 'above') guard.textContent += ' ↓';
      if (mapped[0] === 'near') guard.textContent += ' ≈';
    }
    return mapped[0];
  }
  function frame() {
    const northState = patchLane('north');
    const southState = patchLane('south');
    const battle = $('battleHud') && !$('battleHud').hidden;
    const gold = Number.parseInt($('gold')?.textContent || '0', 10) || 0;
    const pushReady = battle && !$('pushButton')?.disabled;
    const overdriveReady = battle && !$('overdriveButton')?.disabled;
    const interventionReady = gold >= 60 && (pushReady || overdriveReady);
    const lane = selectedLane();
    const toggle = $('actionsToggle');
    if (toggle) toggle.classList.toggle('intervention-ready', interventionReady);
    if ($('actionsLabel')) $('actionsLabel').textContent = interventionReady ? '60g READY' : 'ACTIONS';
    if ($('actionsSummary')) $('actionsSummary').textContent = interventionReady ? `${lane.toUpperCase()} · Push or Overdrive` : $('actionsSummary').textContent;

    const northB = pctFromBastion($('northBastion')?.textContent);
    const southB = pctFromBastion($('southBastion')?.textContent);
    const coreThreat = $('coreState')?.textContent !== 'SECURE';
    const breachLane = northState === 'above' ? 'north' : southState === 'above' ? 'south' : null;
    let threatened = null;
    if (coreThreat) threatened = 'core';
    else if (northB < 90) threatened = 'north';
    else if (southB < 90) threatened = 'south';
    const forkOpen = !!breachLane && !!threatened;
    const cue = $('decisionCue');
    if (cue) {
      cue.hidden = !(battle && (forkOpen || interventionReady));
      if (!cue.hidden) {
        $('decisionCueTitle').textContent = forkOpen ? 'FORK OPEN' : 'INTERVENTION READY';
        $('decisionCueDetail').textContent = forkOpen
          ? `${breachLane.toUpperCase()} damage beats regen while ${threatened === 'core' ? 'the Core' : threatened.toUpperCase() + ' Bastion'} worsens.`
          : `${gold}g banked · choose where it matters.`;
      }
    }
    const objective = $('objectiveText');
    if (battle && objective && $('gateState')?.textContent === 'SHIELDED') {
      if (forkOpen) objective.textContent = `FORK: ${breachLane.toUpperCase()} Guard falling · ${threatened === 'core' ? 'Core under fire' : threatened.toUpperCase() + ' clock worsening'}`;
      else if (breachLane) objective.textContent = `${breachLane.toUpperCase()} damage now beats Guard regen`;
      else if (northState === 'near' || southState === 'near') objective.textContent = `${northState === 'near' ? 'NORTH' : 'SOUTH'} is on the damage/regen edge`;
      else objective.textContent = 'No Guard is losing HP · concentrate pressure';
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
