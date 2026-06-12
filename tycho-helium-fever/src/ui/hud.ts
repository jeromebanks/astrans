import type { Shell } from '../shell';
import * as C from '../sim/constants';
import {
  setAssignment, setMaintainTarget, queueSurvey, setSweepTarget, purchase, buySupply,
  canDispatchShipment, dispatchShipment, bottlePurity, bottleQualifies, machineName,
  fmtTime, daylightFactor, isNight, shipmentValue,
} from '../sim/sim';
import type { Assignment, CrewId, MachineId } from '../sim/types';
import { activeObjectives, isUnlocked } from '../sim/campaign';
import { buildEnding } from '../sim/endings';
import { recordBest } from '../sim/save';
import { evaluateMastery } from '../sim/endings';
import { makePortrait } from '../game/art';
import { audio } from '../game/audio';

const $ = <T extends HTMLElement = HTMLElement>(sel: string): T => document.querySelector(sel) as T;

function el(tag: string, cls: string, html?: string): HTMLElement {
  const e = document.createElement(tag);
  e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  return e;
}

function money(n: number): string {
  const sign = n < 0 ? '−$' : '$';
  return sign + Math.abs(Math.round(n)).toLocaleString('en-US');
}

const ASSIGN_LABELS: Record<Assignment, string> = {
  rest: 'Rest (recover)',
  survey: 'Survey tiles · EVA',
  sweep: 'Drive crawler · EVA',
  extractor: 'Run RF extractor',
  maintain: 'Maintain machine',
};

// ===================================================================== init

export function initHUD(shell: Shell): void {
  const hud = el('div', '');
  hud.id = 'hud';
  hud.innerHTML = `
  <div id="topbar" class="panel">
    <span class="game-title">TYCHO · HELIUM FEVER</span>
    <canvas id="earthphase" width="26" height="26" title="Earth phase — your clock in the sky"></canvas>
    <span id="clock"></span>
    <span id="phase"></span>
    <span class="spacer"></span>
    <span id="moneyline"></span>
    <span id="debtline" title="Helion Dynamics transit loan. First payment due at shipment."></span>
    <span class="spacer"></span>
    <span class="speedctl">
      <button id="spd0" type="button" title="Pause [Space]">⏸</button>
      <button id="spd1" type="button" title="Normal speed [1]">▶</button>
      <button id="spd2" type="button" title="Double speed [2]">▶▶</button>
      <button id="spd4" type="button" title="Quadruple speed [3]">▶▶▶</button>
    </span>
    <button id="buildbtn" type="button" title="Build & order [B]">BUILD</button>
    <button id="helpbtn" type="button" title="Help & reference [H]">?</button>
    <button id="mutebtn" type="button" title="Toggle ambient sound">♪</button>
    <span id="saveflash" aria-live="polite"></span>
  </div>

  <div id="leftcol">
    <div class="panel" id="powerpanel">
      <h3>POWER</h3>
      <div class="row"><span>Generation</span><b id="genv"></b></div>
      <div class="row"><span>Load</span><b id="loadv"></b></div>
      <div class="meter"><div id="battbar"></div><span id="battlabel"></span></div>
      <div id="shedline" class="warntext"></div>
    </div>
    <div class="panel" id="lspanel">
      <h3>LIFE SUPPORT</h3>
      <div class="row"><span>Oxygen</span><b id="o2v"></b></div>
      <div class="row"><span>Water</span><b id="waterv"></b></div>
      <div class="row"><span>CO₂</span><b id="co2v"></b></div>
      <div class="row"><span>Hut temp</span><b id="tempv"></b></div>
      <label class="toggle"><input type="checkbox" id="ecotoggle">
        Economy mode <small>(let CO₂ ride to 4 000 ppm, save ~1.5 kW)</small></label>
    </div>
    <div class="panel" id="machpanel">
      <h3>MACHINES <small>wear</small></h3>
    </div>
    <div class="panel" id="supplypanel">
      <h3>SUPPLIES</h3>
      <div class="row"><span>Spare parts</span><b id="sparesv"></b></div>
      <div id="supplybtns"></div>
    </div>
  </div>

  <div id="rightcol">
    <div class="panel" id="crewpanel"><h3>CREW</h3></div>
    <div class="panel" id="rfpanel">
      <h3>RF EXTRACTOR</h3>
      <div class="row">
        <button id="rftoggle" type="button"></button>
        <b id="yieldv" title="He-3 capture rate"></b>
      </div>
      <canvas id="trace" width="216" height="64" title="Mass-spec trace: H₂ · ³He · ⁴He. Center the bright peak."></canvas>
      <label class="slider">Field strength <input type="range" id="fieldslider" min="0" max="100" step="1">
        <b id="fieldv"></b></label>
      <div class="meter small"><div id="hopperbar"></div><span id="hopperlabel"></span></div>
      <div class="row bottle"><span>Bottle</span><b id="bottlev"></b></div>
      <div class="row"><span>Purity</span><b id="purityv"></b></div>
      <div id="specline"></div>
      <label class="toggle" id="distrow" hidden><input type="checkbox" id="disttoggle"> Fractional distiller</label>
    </div>
    <div class="panel" id="shippanel" hidden>
      <h3>LUNAR TUG RENDEZVOUS</h3>
      <div id="rdvA" class="rdvrow"></div>
      <div id="rdvB" class="rdvrow"></div>
      <div id="shipstatus"></div>
    </div>
  </div>

  <div id="objectives" class="panel">
    <h3 id="actlabel"></h3>
    <ul id="objlist"></ul>
  </div>

  <div id="tileinfo" class="panel" hidden></div>

  <div id="radiolog" class="panel">
    <h3>LOCAL BAND</h3>
    <div id="radiolines"></div>
  </div>

  <div id="toasts" aria-live="polite"></div>
  <div id="buildbar" class="panel" hidden></div>
  <div id="modalroot"></div>
  <div id="tooltip" hidden></div>`;
  document.body.appendChild(hud);

  // ---- top bar wiring
  const setSpeed = (v: 0 | 1 | 2 | 4): void => {
    if (v !== 0) shell.prevSpeed = v;
    shell.speed = v;
    audio.uiClick();
  };
  $('#spd0').onclick = () => setSpeed(0);
  $('#spd1').onclick = () => setSpeed(1);
  $('#spd2').onclick = () => setSpeed(2);
  $('#spd4').onclick = () => setSpeed(4);
  $('#buildbtn').onclick = () => toggleBuildBar(shell);
  $('#helpbtn').onclick = () => showHelp(shell);
  $('#mutebtn').onclick = () => {
    audio.ambient = !audio.ambient;
    audio.setVolume(audio.ambient ? shell.settings.volume : 0);
    $('#mutebtn').classList.toggle('off', !audio.ambient);
  };

  // ---- life support eco toggle
  ($('#ecotoggle') as HTMLInputElement).onchange = (e) => {
    shell.sim.lsEconomy = (e.target as HTMLInputElement).checked;
    audio.uiClick();
  };

  // ---- machines rows
  const mp = $('#machpanel');
  for (const id of ['extractor', 'crawler', 'recycler', 'solar'] as MachineId[]) {
    const row = el('div', 'machrow', `
      <span class="mname">${machineName(id)}</span>
      <span class="meter tiny"><span class="wearbar" id="wear-${id}"></span></span>
      <b class="mstat" id="stat-${id}"></b>`);
    mp.appendChild(row);
  }

  // ---- supplies
  const sb = $('#supplybtns');
  for (const sup of C.SUPPLIES) {
    const b = el('button', 'buybtn', `${sup.name} <small>${money(sup.cost)}</small>`) as HTMLButtonElement;
    b.type = 'button';
    b.onclick = () => {
      const err = buySupply(shell.sim, sup.id);
      if (err) toast(shell, '✗', err, 'warn');
      else audio.chime();
    };
    sb.appendChild(b);
  }

  // ---- crew cards
  const cp = $('#crewpanel');
  for (const id of ['li', 'darrin'] as CrewId[]) {
    const m = shell.sim.crew[id];
    const card = el('div', 'crewcard');
    const port = makePortrait(m.name);
    port.className = 'portrait';
    card.appendChild(port);
    const body = el('div', 'crewbody', `
      <div class="crewname">${m.name} <small id="crewstat-${id}"></small></div>
      <select id="assign-${id}" aria-label="${m.name} assignment"></select>
      <select id="mtarget-${id}" aria-label="${m.name} maintenance target" hidden></select>
      <div class="meter tiny" title="Fatigue"><span class="fatbar" id="fat-${id}"></span></div>`);
    card.appendChild(body);
    cp.appendChild(card);
    const sel = body.querySelector<HTMLSelectElement>(`#assign-${id}`)!;
    for (const [a, label] of Object.entries(ASSIGN_LABELS)) {
      const o = document.createElement('option');
      o.value = a;
      o.textContent = label;
      sel.appendChild(o);
    }
    sel.onchange = () => {
      setAssignment(shell.sim, id, sel.value as Assignment);
      if (sel.value === 'survey' || sel.value === 'sweep' || sel.value === 'maintain') audio.airlock();
    };
    const mt = body.querySelector<HTMLSelectElement>(`#mtarget-${id}`)!;
    for (const mid of ['extractor', 'crawler', 'recycler', 'solar'] as MachineId[]) {
      const o = document.createElement('option');
      o.value = mid;
      o.textContent = machineName(mid);
      mt.appendChild(o);
    }
    mt.onchange = () => setMaintainTarget(shell.sim, id, mt.value as MachineId);
  }

  // ---- extractor wiring
  $('#rftoggle').onclick = () => {
    shell.sim.extractorOn = !shell.sim.extractorOn;
    audio.uiClick();
  };
  const slider = $('#fieldslider') as HTMLInputElement;
  slider.oninput = () => {
    shell.sim.field = Number(slider.value);
  };
  ($('#disttoggle') as HTMLInputElement).onchange = (e) => {
    shell.sim.distillerOn = (e.target as HTMLInputElement).checked;
  };

  // ---- shipment wiring (buttons created in update)

  // ---- keyboard
  window.addEventListener('keydown', (e) => {
    if (shell.cutsceneActive) return;
    const tag = (e.target as HTMLElement)?.tagName;
    if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
    switch (e.key) {
      case ' ':
        e.preventDefault();
        if (shell.modalDepth === 0) setSpeed(shell.speed === 0 ? shell.prevSpeed : 0);
        break;
      case '1': setSpeed(1); break;
      case '2': setSpeed(2); break;
      case '3': setSpeed(4); break;
      case 'b': case 'B': if (shell.modalDepth === 0) toggleBuildBar(shell); break;
      case 'h': case 'H': showHelp(shell); break;
      case 'Escape':
        if (shell.placing) { shell.placing = null; hideBuildBar(); }
        else if (shell.selectedTile >= 0) { shell.selectedTile = -1; shell.refreshUI(); }
        break;
    }
  });

  // tooltip follows pointer
  window.addEventListener('mousemove', (e) => {
    const tip = $('#tooltip');
    if (tip.hidden) return;
    tip.style.left = `${Math.min(e.clientX + 14, window.innerWidth - 240)}px`;
    tip.style.top = `${Math.min(e.clientY + 14, window.innerHeight - 120)}px`;
  });
}

// ===================================================================== tiles

export function refreshTilePanel(shell: Shell): void {
  const box = $('#tileinfo');
  const i = shell.selectedTile;
  if (i < 0) { box.hidden = true; return; }
  const t = shell.sim.tiles[i];
  box.hidden = false;
  const grade = t.surveyed ? `${t.grade.toFixed(1)} ppb` : 'unsurveyed';
  const mass = t.surveyed ? `${t.mass.toFixed(0)} t sweepable` : '—';
  const claim = t.disputed ? (shell.sim.claimDecision === 'strip' ? '<div class="warntext">⚑ Ocean State overlap — stripping it</div>' : '<div class="warntext">⚑ Ocean State claim overlap</div>') : '';
  box.innerHTML = `
    <h3>TILE (${t.x},${t.y}) ${t.rough ? '· rough ground' : ''}</h3>
    <div class="row"><span>³He grade</span><b>${grade}</b></div>
    <div class="row"><span>Regolith</span><b>${mass}</b></div>
    <div class="row"><span>Dust abrasion</span><b>×${t.dust.toFixed(2)}</b></div>
    <div class="row"><span>Travel</span><b>${t.dist} tiles</b></div>
    ${claim}
    <div class="btnrow"></div>`;
  const btns = box.querySelector('.btnrow')!;
  if (!t.surveyed && isUnlocked(shell.campaign, 'survey')) {
    const b = el('button', 'actbtn', shell.sim.surveyQueue.includes(i) ? 'Queued for survey ✓' : 'Queue survey') as HTMLButtonElement;
    b.type = 'button';
    b.onclick = () => { queueSurvey(shell.sim, i); audio.uiClick(); refreshTilePanel(shell); };
    btns.appendChild(b);
  }
  if (t.surveyed && isUnlocked(shell.campaign, 'assign')) {
    const cur = shell.sim.crawler.targetTile === i;
    const b = el('button', 'actbtn', cur ? 'Sweep zone ✓ (click to clear)' : 'Set sweep zone') as HTMLButtonElement;
    b.type = 'button';
    b.onclick = () => {
      if (cur) { shell.sim.crawler.targetTile = -1; }
      else {
        const r = setSweepTarget(shell.sim, i);
        if (r === 'claim') toast(shell, '⚑', 'That ground is inside the Ocean State claim.', 'warn');
        else if (r === 'empty') toast(shell, '◌', 'Nothing left to sweep there.', 'warn');
        else audio.uiClick();
      }
      refreshTilePanel(shell);
    };
    btns.appendChild(b);
  }
  const close = el('button', 'actbtn ghost', 'Close') as HTMLButtonElement;
  close.type = 'button';
  close.onclick = () => { shell.selectedTile = -1; box.hidden = true; };
  btns.appendChild(close);
}

// ===================================================================== build

function toggleBuildBar(shell: Shell): void {
  const bar = $('#buildbar');
  if (!bar.hidden) { hideBuildBar(); shell.placing = null; return; }
  if (!isUnlocked(shell.campaign, 'build')) {
    toast(shell, '▸', 'Construction unlocks once the operation is established.', 'info');
    return;
  }
  bar.hidden = false;
  bar.innerHTML = '<h3>BUILD & ORDER <small>drop pods land in 25 min · Esc to cancel</small></h3><div class="buildgrid"></div>';
  const grid = bar.querySelector('.buildgrid')!;
  for (const def of C.BUILDS) {
    if (def.unlock && !isUnlocked(shell.campaign, def.unlock as 'distiller' | 'cableway')) continue;
    const owned = shell.sim.buildings.filter((b) => b.id === def.id).length;
    const card = el('button', 'buildcard', `
      <strong>${def.name}</strong>
      <span class="cost">${money(def.cost)}${def.unique && owned ? ' · installed' : owned ? ` · ×${owned}` : ''}</span>
      <span class="desc">${def.desc}</span>`) as HTMLButtonElement;
    card.type = 'button';
    card.disabled = (def.unique && owned > 0) || shell.sim.money < def.cost;
    card.onclick = () => {
      shell.placing = def.id;
      audio.uiClick();
      toast(shell, '▸', def.id === 'cableway'
        ? 'Click a surveyed tile away from the hut: that becomes the cableway loading point.'
        : 'Click a tile inside the marked radius around the hut.', 'info');
      hideBuildBar();
    };
    grid.appendChild(card);
  }
}

function hideBuildBar(): void {
  $('#buildbar').hidden = true;
}

/** Called from main when a tile is clicked while in placement mode. */
export function tryPlace(shell: Shell, tileIndex: number): void {
  const id = shell.placing;
  if (!id || tileIndex < 0) return;
  const t = shell.sim.tiles[tileIndex];
  if (id === 'cableway') {
    if (!t.surveyed || t.mass <= 0 || t.dist <= 1) {
      toast(shell, '✗', 'Cableway needs a surveyed tile with regolith, away from the hut.', 'warn');
      return;
    }
    const err = purchase(shell.sim, id, t.x, t.y, tileIndex);
    if (err) { toast(shell, '✗', err, 'warn'); return; }
  } else {
    const near = Math.hypot(t.x - C.BASE_X, t.y - C.BASE_Y) <= C.BUILD_RADIUS;
    const occupied = shell.sim.buildings.some((b) => b.tx === t.x && b.ty === t.y)
      || (t.x === C.BASE_X && t.y === C.BASE_Y) || (t.x === C.BASE_X + 1 && t.y === C.BASE_Y);
    if (!near || occupied) {
      toast(shell, '✗', occupied ? 'That spot is taken.' : 'Too far from the hut — power cables only run so far.', 'warn');
      return;
    }
    const err = purchase(shell.sim, id, t.x, t.y);
    if (err) { toast(shell, '✗', err, 'warn'); return; }
  }
  audio.chime();
  shell.placing = null;
}

// ===================================================================== toasts

const toastIcons: Record<string, string> = { info: '▸', warn: '⚠', danger: '⛔' };

export function toast(shell: Shell, icon: string, text: string, severity: 'info' | 'warn' | 'danger'): void {
  void shell;
  const box = $('#toasts');
  const t = el('div', `toast ${severity}`, `<span class="ticon">${icon || toastIcons[severity]}</span>${text}`);
  box.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, severity === 'danger' ? 9000 : 5500);
  while (box.children.length > 5) box.firstChild?.remove();
}

// ===================================================================== modal

export function showModal(shell: Shell, html: string, buttons: { label: string; detail?: string; cb: () => void }[], cls = ''): void {
  shell.modalDepth++;
  const root = $('#modalroot');
  const wrap = el('div', 'modal-backdrop');
  const box = el('div', `modal panel ${cls}`, html);
  const btnrow = el('div', 'modal-btns');
  for (const b of buttons) {
    const btn = el('button', 'modalbtn', b.detail ? `<strong>${b.label}</strong><span>${b.detail}</span>` : `<strong>${b.label}</strong>`) as HTMLButtonElement;
    btn.type = 'button';
    btn.onclick = () => {
      audio.uiClick();
      wrap.remove();
      shell.modalDepth--;
      b.cb();
    };
    btnrow.appendChild(btn);
  }
  box.appendChild(btnrow);
  wrap.appendChild(box);
  root.appendChild(wrap);
}

export function showEventCard(shell: Shell, title: string, speaker: string, body: string,
  options: { id: string; label: string; detail: string }[], onChoose: (id: string) => void): void {
  const port = makePortrait(speaker === 'Andrei' ? 'Andrei' : speaker === 'Li' ? 'Li' : speaker === 'Darrin' ? 'Darrin' : 'Radio');
  const holder = el('div', '');
  holder.appendChild(port);
  showModal(shell,
    `<div class="ev-head">${holder.innerHTML.length ? '' : ''}<h2>${title}</h2><div class="ev-speaker">${speaker}</div></div>
     <p class="ev-body">${body}</p>`,
    options.map((o) => ({ label: o.label, detail: o.detail, cb: () => onChoose(o.id) })),
    'eventcard');
  // insert the portrait canvas (innerHTML can't carry a live canvas)
  const head = document.querySelector('.eventcard .ev-head');
  if (head) {
    port.className = 'portrait big';
    head.prepend(port);
  }
  audio.radioClick();
}

// ===================================================================== help

export function showHelp(shell: Shell): void {
  showModal(shell, `
    <h2>Reference — Tycho: Helium Fever</h2>
    <div class="helpcols">
    <div>
    <h4>Controls</h4>
    <ul class="helplist">
      <li><b>Click tile</b> — select (survey / sweep zone / build)</li>
      <li><b>Drag / WASD / arrows</b> — pan camera</li>
      <li><b>Mouse wheel</b> — zoom</li>
      <li><b>Space</b> — pause · <b>1/2/3</b> — speed ×1/×2/×4</li>
      <li><b>B</b> — build menu · <b>H</b> — this panel · <b>Esc</b> — cancel/close</li>
    </ul>
    <h4>The loop</h4>
    <ul class="helplist">
      <li>Survey tiles → richer ground (greener = better ppb).</li>
      <li>Assign a driver to <b>Sweep</b>; pick a sweep zone. Regolith fills the hopper.</li>
      <li>Run the <b>RF extractor</b>. Tune field strength to the sweet spot — watch the trace: left peak (H₂) high means field too weak, right peak (⁴He) high means too strong.</li>
      <li>An operator assigned to the extractor auto-chases the drifting sweet spot.</li>
      <li>Fill the bottle: ≥ ${C.BOTTLE_MIN_G} g at ≥ ${Math.round(C.BOTTLE_MIN_PURITY * 100)}% purity, then dispatch to a rendezvous window.</li>
    </ul>
    </div>
    <div>
    <h4>Surviving</h4>
    <ul class="helplist">
      <li>Night lasts ${C.NIGHT_END - C.DAY_END} min with zero solar. Heater needs ${C.LOAD_HEATER_NIGHT} kW. Bank batteries before sunset.</li>
      <li>Brownouts shed loads in priority order; life support goes last.</li>
      <li>Economy mode trades CO₂ (focus, fatigue recovery) for ~1.5 kW.</li>
      <li>Dust wears machines. Wear over ${C.WEAR_RISK}% risks breakdowns; repairs need spares.</li>
      <li>Fatigue over ${C.FATIGUE_SLOW} slows work and risks EVA accidents. Rest matters.</li>
      <li>Every EVA airlock cycle costs ${C.O2_AIRLOCK} kg of oxygen.</li>
    </ul>
    <h4>Money</h4>
    <ul class="helplist">
      <li>³He sells at $8,000/g, scaled by purity tier.</li>
      <li>Loan service: ${money(C.LOAN_PAYMENT)} at window A, ${money(C.LOAN_PAYMENT_LATE)} at window B.</li>
      <li>Claim fees drip ${money(C.EXPENSE_DRIP)}/min. Deep overdraft ends the run.</li>
      <li>Windows: A ${fmtTime(C.RDV_A_OPEN)}–${fmtTime(C.RDV_A_CLOSE)} (in the night) · B ${fmtTime(C.RDV_B_OPEN)}–${fmtTime(C.RDV_B_CLOSE)}. The trip takes ${C.SHIPMENT_TRIP_MIN} min.</li>
    </ul>
    </div></div>`,
    [{ label: 'Back to the crater', cb: () => { /* resume */ } }], 'helpbox');
}

// ===================================================================== update

let lastUpd = '';

export function updateHUD(shell: Shell): void {
  const s = shell.sim;
  const c = shell.campaign;

  // clock + phase
  const night = isNight(s.t);
  $('#clock').textContent = `T+${fmtTime(s.t)}`;
  let phaseTxt: string;
  if (s.t < C.DAY_END) phaseTxt = `DAYLIGHT · sunset in ${fmtTime(C.DAY_END - s.t)}`;
  else if (night) phaseTxt = `LUNAR NIGHT · sunrise in ${fmtTime(C.NIGHT_END - s.t)}`;
  else phaseTxt = `DAYLIGHT · rendezvous B ${s.t < C.RDV_B_OPEN ? 'in ' + fmtTime(C.RDV_B_OPEN - s.t) : 'window OPEN'}`;
  $('#phase').textContent = phaseTxt;
  $('#phase').classList.toggle('nightphase', night);

  drawEarthPhase(s.t);

  $('#moneyline').textContent = money(s.money);
  $('#moneyline').classList.toggle('neg', s.money < 0);
  $('#debtline').textContent = `debt ${money(s.debt)}`;

  for (const v of [0, 1, 2, 4]) {
    $(`#spd${v}`).classList.toggle('active', shell.speed === v && !shell.paused() || (v === 0 && shell.paused()));
  }

  // power
  $('#genv').textContent = `${s.gen.toFixed(1)} kW`;
  $('#loadv').textContent = `${s.load.toFixed(1)} kW`;
  const battPct = (s.battery / s.batteryCap) * 100;
  $('#battbar').style.width = `${battPct.toFixed(1)}%`;
  $('#battbar').className = battPct < 20 ? 'low' : battPct < 45 ? 'mid' : '';
  $('#battlabel').textContent = `Battery ${s.battery.toFixed(1)} / ${s.batteryCap} kWh`;
  $('#shedline').textContent = s.shed.length ? `⚡ shedding: ${s.shed.join(', ')}` : '';

  // life support
  $('#o2v').textContent = `${s.o2.toFixed(1)} kg`;
  $('#o2v').className = s.o2 < C.O2_WARN ? 'bad' : '';
  $('#waterv').textContent = `${s.water.toFixed(0)} kg`;
  $('#waterv').className = s.water < 10 ? 'bad' : '';
  $('#co2v').textContent = `${Math.round(s.co2)} ppm`;
  $('#co2v').className = s.co2 > C.CO2_WARN ? 'bad' : s.co2 > 3000 ? 'warn' : '';
  $('#tempv').textContent = `${s.habTemp.toFixed(1)} °C`;
  $('#tempv').className = s.habTemp < C.TEMP_WARN ? 'bad' : '';
  ($('#ecotoggle') as HTMLInputElement).checked = s.lsEconomy;

  // machines
  for (const id of ['extractor', 'crawler', 'recycler', 'solar'] as MachineId[]) {
    const m = s.machines[id];
    const bar = $(`#wear-${id}`);
    const pct = id === 'solar' ? (m.wear / C.SOLAR_DUST_MAX) : m.wear;
    bar.style.width = `${Math.min(100, pct).toFixed(0)}%`;
    bar.className = `wearbar ${m.broken ? 'broke' : m.wear > C.WEAR_RISK ? 'low' : m.wear > C.WEAR_SLOW ? 'mid' : ''}`;
    $(`#stat-${id}`).textContent = m.broken ? 'DOWN' : id === 'solar' ? `${m.wear.toFixed(0)}% film` : `${m.wear.toFixed(0)}%`;
    $(`#stat-${id}`).className = `mstat ${m.broken ? 'bad' : ''}`;
  }
  $('#sparesv').textContent = `×${s.spares}`;
  $('#sparesv').className = s.spares === 0 ? 'bad' : '';

  // crew
  for (const id of ['li', 'darrin'] as CrewId[]) {
    const m = s.crew[id];
    const sel = $(`#assign-${id}`) as HTMLSelectElement;
    if (sel.value !== m.assignment && document.activeElement !== sel) sel.value = m.assignment;
    sel.disabled = !isUnlocked(c, 'assign') || m.injuredUntil > s.t || m.busyUntil > s.t;
    const mt = $(`#mtarget-${id}`) as HTMLSelectElement;
    mt.hidden = m.assignment !== 'maintain';
    if (mt.value !== m.maintainTarget && document.activeElement !== mt) mt.value = m.maintainTarget;
    $(`#fat-${id}`).style.width = `${m.fatigue.toFixed(0)}%`;
    $(`#fat-${id}`).className = `fatbar ${m.fatigue > C.FATIGUE_SLOW ? 'low' : m.fatigue > 45 ? 'mid' : ''}`;
    const stat = m.injuredUntil > s.t ? `✚ injured ${Math.ceil(m.injuredUntil - s.t)} min`
      : m.busyUntil > s.t ? `◍ ${m.busyLabel} (${Math.ceil(m.busyUntil - s.t)} min)`
        : m.eva ? '◉ EVA' : '';
    $(`#crewstat-${id}`).textContent = stat;
  }

  // extractor
  const rfb = $('#rftoggle') as HTMLButtonElement;
  rfb.textContent = s.extractorOn ? '■ STOP' : '▶ START';
  rfb.className = s.extractorOn ? 'running' : '';
  rfb.disabled = s.machines.extractor.broken || s.t < s.standDownUntil;
  if (s.t < s.standDownUntil) rfb.textContent = `MAINT ${Math.ceil(s.standDownUntil - s.t)}m`;
  $('#yieldv').textContent = `${s.lastYieldRate.toFixed(0)} mg/min`;
  const slider = $('#fieldslider') as HTMLInputElement;
  if (document.activeElement !== slider) slider.value = String(Math.round(s.field));
  slider.disabled = !isUnlocked(c, 'tuning');
  $('#fieldv').textContent = `${Math.round(s.field)}`;
  drawTrace(s.lastPurityTrace, s.extractorOn && s.lastYieldRate > 0);
  const hopPct = (s.hopper / s.hopperCap) * 100;
  $('#hopperbar').style.width = `${hopPct.toFixed(0)}%`;
  $('#hopperlabel').textContent = `Hopper ${s.hopper.toFixed(0)} / ${s.hopperCap} t · grade ${s.hopperGrade.toFixed(1)}`;
  $('#bottlev').textContent = `${s.bottleHe3.toFixed(1)} g of ${C.BOTTLE_MIN_G} g`;
  const pur = bottlePurity(s);
  $('#purityv').textContent = `${(pur * 100).toFixed(1)} %`;
  const q = bottleQualifies(s);
  $('#specline').innerHTML = s.shipped
    ? `✓ shipped ${s.shippedGrams.toFixed(0)} g @ ${(s.shippedPurity * 100).toFixed(1)}%`
    : q ? '✓ MEETS SHIPMENT SPEC' : `✗ below spec (${C.BOTTLE_MIN_G} g @ ${Math.round(C.BOTTLE_MIN_PURITY * 100)}%)`;
  $('#specline').className = q || s.shipped ? 'ok' : 'pending';
  const distBuilt = s.buildings.some((b) => b.id === 'distiller' && b.readyAt <= s.t);
  ($('#distrow') as HTMLElement).hidden = !distBuilt;
  if (distBuilt) ($('#disttoggle') as HTMLInputElement).checked = s.distillerOn;

  // shipment panel
  const sp = $('#shippanel');
  sp.hidden = !isUnlocked(c, 'shipping');
  if (!sp.hidden) {
    renderRdvRow(shell, 'A', C.RDV_A_OPEN, C.RDV_A_CLOSE);
    renderRdvRow(shell, 'B', C.RDV_B_OPEN, C.RDV_B_CLOSE);
    const ps = s.pendingShipment;
    $('#shipstatus').textContent = s.shipped
      ? `Delivered at window ${s.shippedWindow}: ${money(shipmentValue(s.shippedGrams, s.shippedPurity))} (loan serviced)`
      : ps.active ? `Bottle en route — delivery ${fmtTime(ps.deliverAt)}` : '';
  }

  // objectives
  $('#actlabel').textContent = `ACT — ${actName(c.act)}`;
  const objs = activeObjectives(c, s);
  const key = objs.map((o) => `${o.obj.id}${o.done}`).join() + c.act;
  if (key !== lastUpd) {
    lastUpd = key;
    const ul = $('#objlist');
    ul.innerHTML = '';
    for (const o of objs) {
      ul.appendChild(el('li', o.done ? 'done' : '', `<span class="check">${o.done ? '☑' : '☐'}</span> ${o.obj.text}`));
    }
  }

  // radio log (incremental)
  while (shell.seenRadio < s.radio.length) {
    const r = s.radio[shell.seenRadio++];
    const line = el('div', 'radioline', `<b>${r.speaker}</b> <span>${r.text}</span>`);
    $('#radiolines').appendChild(line);
    const box = $('#radiolines');
    while (box.children.length > 30) box.firstChild?.remove();
    box.scrollTop = box.scrollHeight;
    audio.radioClick();
  }

  // alerts → toasts + sound
  while (shell.seenAlerts < s.alerts.length) {
    const a = s.alerts[shell.seenAlerts++];
    toast(shell, a.icon, a.text, a.severity);
    if (a.severity === 'danger') audio.danger();
    else if (a.severity === 'warn') audio.warn();
  }

  // tooltip for hovered tile
  const tip = $('#tooltip');
  const hi = shell.hoverTile;
  if (hi >= 0 && shell.modalDepth === 0 && !shell.cutsceneActive) {
    const t = s.tiles[hi];
    tip.hidden = false;
    tip.innerHTML = t.surveyed
      ? `<b>(${t.x},${t.y})</b> ${t.grade.toFixed(1)} ppb · ${t.mass.toFixed(0)} t · dust ×${t.dust.toFixed(2)}${t.disputed ? ' · ⚑ OS claim' : ''}`
      : `<b>(${t.x},${t.y})</b> unsurveyed`;
  } else {
    tip.hidden = true;
  }

  audio.setHum(s.extractorOn && s.lastYieldRate > 0, s.brownout);
}

function renderRdvRow(shell: Shell, w: 'A' | 'B', open: number, close: number): void {
  const s = shell.sim;
  const row = $(`#rdv${w}`);
  let status: string;
  if (s.t > close) status = 'window closed';
  else if (s.t >= open) status = `OPEN — closes ${fmtTime(close)}`;
  else status = `opens ${fmtTime(open)} (${fmtTime(open - s.t)} from now)`;
  const err = canDispatchShipment(s, w);
  row.innerHTML = `<span>Window ${w} <small>${fmtTime(open)}–${fmtTime(close)}${w === 'A' ? ' · during the night' : ''}</small></span><b>${status}</b>`;
  const btn = el('button', 'actbtn', `Dispatch bottle → ${w}`) as HTMLButtonElement;
  btn.type = 'button';
  btn.disabled = !!err || s.t > close;
  btn.title = err ?? `Crawler trip: ${C.SHIPMENT_TRIP_MIN} min`;
  btn.onclick = () => {
    const e2 = dispatchShipment(s, w);
    if (e2) toast(shell, '✗', e2, 'warn');
    else { audio.chime(); }
  };
  if (s.t <= close && !s.shipped && !s.pendingShipment.active) row.appendChild(btn);
  if (err && s.t <= close && !s.shipped && !s.pendingShipment.active) {
    row.appendChild(el('div', 'dispatchwhy', err));
  }
}

function actName(act: string): string {
  return {
    tokaplex: 'I · Helium Fever', recruit: 'II · The Operator', ballcrater: 'III · Ball Crater',
    tycho: 'IV · The Moon is Hard', night: 'V · First Lunar Night', shipment: 'VI · Rendezvous',
    epilogue: 'VII · Beyond Helium',
  }[act] ?? act;
}

// ---- small canvases

function drawTrace(tr: { he3: number; he4: number; h2: number }, live: boolean): void {
  const cv = $('#trace') as HTMLCanvasElement;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#0a0f18';
  g.fillRect(0, 0, cv.width, cv.height);
  g.strokeStyle = '#1d2738';
  for (let y = 12; y < 64; y += 13) { g.beginPath(); g.moveTo(0, y); g.lineTo(216, y); g.stroke(); }
  const max = Math.max(tr.he3 + tr.he4 + tr.h2, 1);
  const peaks: [number, number, string, string][] = [
    [46, tr.h2 / max, '#9fc4e8', 'H₂'],
    [108, (tr.he3 * 4) / max, '#5dd47e', '³He'],
    [170, tr.he4 / max, '#ffaa00', '⁴He'],
  ];
  g.font = '9px monospace';
  for (const [x, v, color, label] of peaks) {
    const h = Math.min(1, v) * 46;
    g.strokeStyle = color;
    g.lineWidth = 1.5;
    g.beginPath();
    for (let dx = -22; dx <= 22; dx++) {
      const y = 56 - h * Math.exp(-(dx * dx) / 60) * (live ? (0.92 + Math.random() * 0.08) : 0);
      dx === -22 ? g.moveTo(x + dx, y) : g.lineTo(x + dx, y);
    }
    g.stroke();
    g.fillStyle = color;
    g.fillText(label, x - 8, 62);
  }
  if (!live) {
    g.fillStyle = '#56607a';
    g.fillText('NO FLOW', 88, 30);
  }
}

function drawEarthPhase(t: number): void {
  const cv = $('#earthphase') as HTMLCanvasElement;
  const g = cv.getContext('2d')!;
  g.clearRect(0, 0, 26, 26);
  g.fillStyle = '#3a78c2';
  g.beginPath(); g.arc(13, 13, 10, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.45)';
  g.beginPath(); g.ellipse(10, 10, 5, 3, 0.5, 0, Math.PI * 2); g.fill();
  // phase shadow: Earth is full at lunar midnight, new at lunar noon
  const cycle = (t % 960) / 960;
  const k = Math.cos(cycle * Math.PI * 2); // crude but readable phase
  g.fillStyle = 'rgba(4,6,12,0.88)';
  g.beginPath();
  g.arc(13, 13, 10, -Math.PI / 2, Math.PI / 2, k < 0);
  g.ellipse(13, 13, Math.abs(k) * 10, 10, 0, Math.PI / 2, -Math.PI / 2, k > 0);
  g.fill();
  g.strokeStyle = '#2c3548';
  g.beginPath(); g.arc(13, 13, 10.5, 0, Math.PI * 2); g.stroke();
}

// ===================================================================== end screen

export function showEndScreen(shell: Shell): void {
  const s = shell.sim;
  const end = buildEnding(s, shell.campaign);
  const masteries = s.won ? evaluateMastery(s) : [];
  recordBest({
    won: s.won,
    grams: s.shippedGrams,
    purity: s.shippedPurity,
    money: Math.round(s.money),
    masteries: masteries.filter((m) => m.achieved).map((m) => m.id),
    seed: s.seed,
  });
  const mhtml = masteries.length
    ? `<h4>Mastery</h4><ul class="masteries">${masteries.map((m) =>
      `<li class="${m.achieved ? 'got' : 'missed'}">${m.achieved ? '★' : '☆'} ${m.label}</li>`).join('')}</ul>`
    : '';
  showModal(shell, `
    <h2 class="${s.won ? 'wintitle' : 'losstitle'}">${end.title}</h2>
    ${end.paragraphs.map((p) => `<p class="endpara">${p}</p>`).join('')}
    ${mhtml}
    <p class="endstats">Run seed ${s.seed} · ${Math.round(s.stats.tonsProcessed)} t processed · peak ${Math.round(s.stats.peakYieldRate)} mg/min · ${s.stats.evaCycles} airlock cycles</p>`,
    [
      { label: 'New run (new crater)', detail: 'Fresh seed: new grades, new trouble', cb: () => shell.refreshUI.call(null) },
    ], 'endscreen');
  // the New Run button is wired by main via refreshUI sentinel; rebind:
  const btn = document.querySelector<HTMLButtonElement>('.endscreen .modalbtn');
  if (btn) btn.onclick = () => window.dispatchEvent(new CustomEvent('thf-newrun'));
}
