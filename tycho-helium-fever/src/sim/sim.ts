import * as C from './constants';
import { makeRng, range, chance } from './rng';
import { genMap } from './map';
import type {
  SimState, CrewMember, CrewId, Assignment, MachineId, LossReason,
} from './types';

// ---------------------------------------------------------------- creation

export function createSim(seed: number): SimState {
  const tiles = genMap(seed);
  return {
    seed,
    rng: makeRng(seed ^ 0x5eed),
    t: 0,
    battery: C.START_BATT_CAP * C.START_BATT_FRAC,
    batteryCap: C.START_BATT_CAP,
    dischargeLimit: C.BATT_DISCHARGE_BASE,
    solarPanels: C.START_PANELS,
    gen: 0,
    load: 0,
    brownout: false,
    shed: [],
    o2: C.O2_START,
    water: C.WATER_START,
    co2: C.CO2_NORMAL,
    habTemp: C.TEMP_NORMAL,
    lsEconomy: false,
    cdO2: -1, cdCo2: -1, cdCold: -1, cdWater: -1,
    spares: C.SPARES_START,
    hopper: 6, // they left the hopper part-full before the trip in
    hopperGrade: 3.4,
    hopperCap: C.HOPPER_CAP,
    bottleHe3: 0,
    bottleImp: 0,
    shipped: false,
    shippedGrams: 0,
    shippedPurity: 0,
    shippedWindow: '',
    pendingShipment: { active: false, window: 'A', departAt: 0, deliverAt: 0, grams: 0, purity: 0 },
    extractorOn: false,
    field: 50,
    fieldOptimal: 42,
    tonsSinceDrift: 0,
    throughputUpgraded: false,
    distillerOn: true,
    lastYieldRate: 0,
    lastPurityTrace: { he3: 0, he4: 0, h2: 0 },
    money: C.MONEY_START,
    debt: C.DEBT_START,
    crawler: {
      phase: 'idle', x: C.BASE_X, y: C.BASE_Y, targetTile: -1,
      cargo: 0, cargoGrade: 0, battery: C.CRAWLER_BATT, progress: 0,
      upgraded: false, shipmentReturnAt: 0,
    },
    buildings: [],
    machines: {
      crawler: { wear: 12, broken: false },
      extractor: { wear: 8, broken: false },
      recycler: { wear: 5, broken: false },
      solar: { wear: 0, broken: false },
    },
    crew: {
      li: mkCrew('li', 'Li'),
      darrin: mkCrew('darrin', 'Darrin'),
    },
    tiles,
    surveyQueue: [],
    surveyProgress: 0,
    alerts: [],
    radio: [],
    stats: { lsEmergencies: 0, injuries: 0, breakdowns: 0, tonsProcessed: 0, peakYieldRate: 0, evaCycles: 0 },
    scores: { production: 0, safety: 0, debt: 0, ethics: 0 },
    claimDecision: '',
    pushRisk: false,
    standDownUntil: 0,
    ended: false,
    lossReason: null,
    lossDetail: '',
    won: false,
  };
}

function mkCrew(id: CrewId, name: string): CrewMember {
  return {
    id, name, assignment: 'rest', fatigue: 15, injuredUntil: 0,
    busyUntil: 0, busyLabel: '', eva: false, maintainTarget: 'extractor',
  };
}

// ---------------------------------------------------------------- helpers

export function daylightFactor(t: number): number {
  if (t < C.DAY_END) return 1;
  if (t < C.DAY_END + C.SOLAR_RAMP) return 1 - (t - C.DAY_END) / C.SOLAR_RAMP;
  if (t < C.NIGHT_END - C.SOLAR_RAMP) return 0;
  if (t < C.NIGHT_END) return (t - (C.NIGHT_END - C.SOLAR_RAMP)) / C.SOLAR_RAMP;
  return 1;
}

export function isNight(t: number): boolean {
  return t >= C.DAY_END && t < C.NIGHT_END;
}

/** RF coupling efficiency vs. distance from the (hidden) Larmor sweet spot. */
export function fieldEfficiency(field: number, optimal: number): number {
  const off = Math.abs(field - optimal) / C.FIELD_TOLERANCE;
  return Math.max(0.25, 1 - Math.pow(off, 1.5));
}

export function bottlePurity(s: { bottleHe3: number; bottleImp: number }): number {
  const total = s.bottleHe3 + s.bottleImp;
  return total <= 0 ? 0 : s.bottleHe3 / total;
}

export function purityPriceFactor(purity: number): number {
  if (purity >= 0.25) return 1.3;
  if (purity >= 0.12) return 1.15;
  if (purity >= 0.09) return 1.0;
  if (purity >= C.BOTTLE_MIN_PURITY) return 0.85;
  return 0.5;
}

export function shipmentValue(grams: number, purity: number): number {
  return Math.round(grams * C.HE3_PRICE_PER_G * purityPriceFactor(purity));
}

export function bottleQualifies(s: SimState): boolean {
  return s.bottleHe3 >= C.BOTTLE_MIN_G && bottlePurity(s) >= C.BOTTLE_MIN_PURITY;
}

export function addAlert(s: SimState, id: string, icon: string, text: string, severity: 'info' | 'warn' | 'danger'): void {
  const recent = s.alerts.find((a) => a.id === id && s.t - a.t < 30);
  if (recent) return;
  s.alerts.push({ id, icon, text, severity, t: s.t });
  if (s.alerts.length > 60) s.alerts.splice(0, s.alerts.length - 60);
}

export function addRadio(s: SimState, speaker: string, text: string): void {
  if (s.radio.some((r) => r.text === text)) return; // never repeat a line verbatim
  s.radio.push({ speaker, text, t: s.t });
  if (s.radio.length > 80) s.radio.splice(0, s.radio.length - 80);
}

function crewEff(s: SimState, m: CrewMember): number {
  if (m.injuredUntil > s.t || m.busyUntil > s.t) return 0;
  let e = 1;
  if (m.fatigue > C.FATIGUE_SLOW) e *= C.FATIGUE_EFF;
  if (s.co2 > C.CO2_WARN) e *= 0.75;
  if (s.water <= 0) e *= 0.4;
  return e;
}

function wearEff(wear: number): number {
  return wear <= C.WEAR_SLOW ? 1 : 1 - (wear - C.WEAR_SLOW) / 100;
}

function hasReady(s: SimState, id: string): boolean {
  return s.buildings.some((b) => b.id === id && b.readyAt <= s.t);
}

function countReady(s: SimState, id: string): number {
  return s.buildings.filter((b) => b.id === id && b.readyAt <= s.t).length;
}

/** Recompute capacities derived from delivered buildings. */
export function recomputeDerived(s: SimState): void {
  s.solarPanels = C.START_PANELS + countReady(s, 'solar');
  s.batteryCap = C.START_BATT_CAP + countReady(s, 'battery') * C.BATT_BANK_CAP;
  s.dischargeLimit = C.BATT_DISCHARGE_BASE + countReady(s, 'battery') * C.BATT_DISCHARGE_PER_BANK;
  s.hopperCap = C.HOPPER_CAP + countReady(s, 'hopper') * C.HOPPER_EXT;
  s.throughputUpgraded = hasReady(s, 'rf_upgrade');
  s.crawler.upgraded = hasReady(s, 'crawler_upgrade');
}

// ---------------------------------------------------------------- actions

export function setAssignment(s: SimState, id: CrewId, a: Assignment): void {
  const m = s.crew[id];
  if (m.assignment === a) return;
  m.assignment = a;
  const evaJobs: Assignment[] = ['survey', 'sweep', 'maintain'];
  const wantsEva = evaJobs.includes(a) && !(a === 'maintain' && m.maintainTarget === 'recycler');
  if (wantsEva !== m.eva) {
    m.eva = wantsEva;
    s.o2 = Math.max(0, s.o2 - C.O2_AIRLOCK);
    s.stats.evaCycles++;
  }
}

export function setMaintainTarget(s: SimState, id: CrewId, target: MachineId): void {
  const m = s.crew[id];
  m.maintainTarget = target;
  if (m.assignment === 'maintain') {
    const wantsEva = target !== 'recycler';
    if (wantsEva !== m.eva) {
      m.eva = wantsEva;
      s.o2 = Math.max(0, s.o2 - C.O2_AIRLOCK);
      s.stats.evaCycles++;
    }
  }
}

export function queueSurvey(s: SimState, tileIndex: number): void {
  const t = s.tiles[tileIndex];
  if (!t || t.surveyed || s.surveyQueue.includes(tileIndex)) return;
  s.surveyQueue.push(tileIndex);
}

export function setSweepTarget(s: SimState, tileIndex: number): 'ok' | 'unsurveyed' | 'claim' | 'empty' {
  const t = s.tiles[tileIndex];
  if (!t || !t.surveyed) return 'unsurveyed';
  if (t.disputed && s.claimDecision !== 'strip') return 'claim';
  if (t.mass <= 0) return 'empty';
  s.crawler.targetTile = tileIndex;
  return 'ok';
}

export function purchase(s: SimState, buildId: string, tx: number, ty: number, sourceTile?: number): string | null {
  const def = C.BUILDS.find((b) => b.id === buildId);
  if (!def) return 'Unknown item';
  if (def.unique && s.buildings.some((b) => b.id === buildId)) return 'Already installed';
  if (s.money < def.cost) return 'Not enough funds';
  s.money -= def.cost;
  s.buildings.push({ id: buildId, tx, ty, sourceTile, readyAt: s.t + C.DELIVERY_MIN });
  addAlert(s, `order-${buildId}-${s.t}`, '▸', `${def.name} ordered — drop pod in ${C.DELIVERY_MIN} min`, 'info');
  return null;
}

export function buySupply(s: SimState, supplyId: string): string | null {
  const def = C.SUPPLIES.find((x) => x.id === supplyId);
  if (!def) return 'Unknown item';
  if (s.money < def.cost) return 'Not enough funds';
  s.money -= def.cost;
  // supplies ride the same drop pod schedule, applied immediately for simplicity
  // of play (they are consumables, not placed structures) — flavored as express.
  if (supplyId === 'o2') s.o2 += 10;
  if (supplyId === 'water') s.water += 50;
  if (supplyId === 'spares') s.spares += 3;
  addAlert(s, `supply-${supplyId}-${s.t}`, '▸', `${def.name} delivered by Lunar Tug drop`, 'info');
  return null;
}

export function canDispatchShipment(s: SimState, window: 'A' | 'B'): string | null {
  const open = window === 'A' ? C.RDV_A_OPEN : C.RDV_B_OPEN;
  const close = window === 'A' ? C.RDV_A_CLOSE : C.RDV_B_CLOSE;
  if (s.shipped || s.pendingShipment.active) return 'Shipment already underway';
  if (s.t + C.SHIPMENT_TRIP_MIN > close) return 'Too late to reach this window';
  if (!bottleQualifies(s)) {
    return `Bottle below spec — need ${C.BOTTLE_MIN_G} g at ≥${Math.round(C.BOTTLE_MIN_PURITY * 100)}% purity`;
  }
  const c = s.crawler;
  if (c.phase === 'shipment') return 'Crawler already en route';
  if (s.machines.crawler.broken || c.phase === 'jammed') return 'Crawler is down — repair it first';
  if (c.phase !== 'idle' && c.phase !== 'charging' && c.phase !== 'dumping') return 'Crawler must be back at the hut';
  if (c.battery < 8) return 'Crawler battery too low for the trip (need 8 kWh)';
  void open;
  return null;
}

export function dispatchShipment(s: SimState, window: 'A' | 'B'): string | null {
  const err = canDispatchShipment(s, window);
  if (err) return err;
  const open = window === 'A' ? C.RDV_A_OPEN : C.RDV_B_OPEN;
  const deliverAt = Math.max(s.t + C.SHIPMENT_TRIP_MIN, open);
  s.pendingShipment = {
    active: true, window, departAt: s.t, deliverAt,
    grams: s.bottleHe3, purity: bottlePurity(s),
  };
  s.bottleHe3 = 0;
  s.bottleImp = 0;
  s.crawler.phase = 'shipment';
  s.crawler.targetTile = -1;
  s.crawler.shipmentReturnAt = deliverAt + C.SHIPMENT_TRIP_MIN;
  addAlert(s, 'shipment-out', '⬆', `Bottle en route to rendezvous ${window} — delivery at ${fmtTime(deliverAt)}`, 'info');
  return null;
}

export function applyDecisionEffect(s: SimState, id: string, choice: string): void {
  switch (id) {
    case 'wreck': // Act 3 — salvage the darksided crawler
      if (choice === 'salvage') {
        s.o2 += 8;
        s.spares += 1;
        s.scores.ethics -= 1;
      } else {
        s.scores.ethics += 1;
      }
      break;
    case 'claim': // Ocean State overlap
      s.claimDecision = choice === 'strip' ? 'strip' : 'respect';
      if (choice === 'strip') s.scores.ethics -= 2;
      else s.scores.ethics += 2;
      break;
    case 'miner': // stranded miner request
      if (choice === 'help') {
        s.o2 = Math.max(0, s.o2 - 6);
        s.crew.darrin.busyUntil = s.t + 45;
        s.crew.darrin.busyLabel = 'Running oxygen out to Kessler';
        s.scores.ethics += 2;
      } else {
        s.scores.ethics -= 2;
      }
      break;
    case 'push': // maintenance window vs rendezvous A
      if (choice === 'push') {
        s.pushRisk = true;
        s.scores.safety -= 1;
      } else {
        s.standDownUntil = s.t + 60;
        s.extractorOn = false;
        s.machines.extractor.wear = Math.max(0, s.machines.extractor.wear - 30);
        s.scores.safety += 2;
      }
      break;
    case 'cache': // Andrei's darksided-buyer packages at the rendezvous
      if (choice === 'accept') {
        s.o2 += 6;
        s.water += 30;
        s.spares += 2;
      }
      break;
  }
}

export function fmtTime(t: number): string {
  const h = Math.floor(t / 60);
  const m = Math.floor(t % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

// ---------------------------------------------------------------- tick

/** Advance exactly one sim minute. Deterministic given state. */
export function tick(s: SimState): void {
  if (s.ended) return;
  s.t += 1;
  recomputeDerived(s);
  stepPower(s);
  stepLifeSupport(s);
  stepCrew(s);
  stepCrawler(s);
  stepCableway(s);
  stepExtractor(s);
  stepDistiller(s);
  stepMaintenance(s);
  stepEconomy(s);
  stepShipment(s);
  checkLoss(s);
}

// ---- power --------------------------------------------------------------

interface LoadItem { id: string; kw: number; }

function stepPower(s: SimState): void {
  const dustFilm = Math.min(C.SOLAR_DUST_MAX, s.machines.solar.wear / 100);
  s.gen = s.solarPanels * C.PANEL_KW * daylightFactor(s.t) * (1 - dustFilm);

  const night = isNight(s.t);
  const hasRecycler = hasReady(s, 'recycler');
  const lsFull = s.lsEconomy
    ? (hasRecycler ? 2 : C.LOAD_LIFE_SUPPORT_LOW)
    : (hasRecycler ? 3 : C.LOAD_LIFE_SUPPORT);

  // priority order: cheapest to lose first is LAST in this array; we fill from
  // the front. Life support first, heater second.
  const wantCharge = (s.crawler.phase === 'charging' || s.crawler.phase === 'idle' || s.crawler.phase === 'dumping')
    && s.crawler.battery < C.CRAWLER_BATT - 0.01;
  const extractorWants = s.extractorOn && !s.machines.extractor.broken && s.hopper > 0 && s.t >= s.standDownUntil;
  const extractorKw = C.LOAD_EXTRACTOR_BASE + C.LOAD_EXTRACTOR_FIELD * Math.pow(s.field / 100, 2);
  const benchActive = hasReady(s, 'bench')
    && Object.values(s.crew).some((m) => m.assignment === 'maintain' && crewEff(s, m) > 0);
  const distActive = hasReady(s, 'distiller') && s.distillerOn && s.bottleImp > 0.01;
  const cableActive = s.buildings.some((b) => b.id === 'cableway' && b.readyAt <= s.t);

  const items: LoadItem[] = [
    { id: 'life', kw: lsFull },
    { id: 'heater', kw: night ? C.LOAD_HEATER_NIGHT : C.LOAD_HEATER_DAY },
    { id: 'extractor', kw: extractorWants ? extractorKw : 0 },
    { id: 'charge', kw: wantCharge ? C.CRAWLER_CHARGE_KW : 0 },
    { id: 'distiller', kw: distActive ? C.LOAD_DISTILLER : 0 },
    { id: 'cableway', kw: cableActive ? C.LOAD_CABLEWAY : 0 },
    { id: 'bench', kw: benchActive ? C.LOAD_BENCH : 0 },
  ];

  const genE = s.gen / 60; // kWh available this minute from solar
  const battE = Math.min(s.dischargeLimit / 60, s.battery);
  let budget = genE + battE;
  const powered = new Set<string>();
  s.shed = [];
  let used = 0;
  for (const it of items) {
    if (it.kw <= 0) continue;
    const e = it.kw / 60;
    if (e <= budget + 1e-9) {
      budget -= e;
      used += e;
      powered.add(it.id);
    } else {
      s.shed.push(it.id);
    }
  }
  // battery balance
  const fromBatt = Math.max(0, used - genE);
  const surplus = Math.max(0, genE - used);
  s.battery = Math.min(s.batteryCap, s.battery - fromBatt + surplus);
  s.load = used * 60;
  s.brownout = s.shed.some((id) => id !== 'charge' && id !== 'bench');
  if (s.brownout) {
    addAlert(s, 'brownout', '⚡', `Brownout — shedding: ${s.shed.join(', ')}`, 'danger');
  }

  // stash powered set for the rest of the tick
  (s as unknown as { _powered: Set<string> })._powered = powered;
  if (powered.has('charge')) {
    s.crawler.battery = Math.min(C.CRAWLER_BATT, s.crawler.battery + C.CRAWLER_CHARGE_KW / 60);
  }
}

function poweredSet(s: SimState): Set<string> {
  return (s as unknown as { _powered?: Set<string> })._powered ?? new Set();
}

// ---- life support -------------------------------------------------------

function stepLifeSupport(s: SimState): void {
  const p = poweredSet(s);
  const lsOk = p.has('life') && !s.machines.recycler.broken;
  const night = isNight(s.t);

  // oxygen & water
  s.o2 = Math.max(0, s.o2 - (lsOk ? C.O2_USE : C.O2_USE_UNPOWERED));
  s.water = Math.max(0, s.water - C.WATER_USE);

  // CO2
  const recoverRate = hasReady(s, 'recycler') ? C.CO2_RECOVER * 1.5 : C.CO2_RECOVER;
  if (!lsOk) {
    s.co2 += C.CO2_RATE;
  } else {
    const target = s.lsEconomy ? C.CO2_ECONOMY : C.CO2_NORMAL;
    if (s.co2 > target) s.co2 = Math.max(target, s.co2 - recoverRate);
    else s.co2 = Math.min(target, s.co2 + C.CO2_RATE * 0.5);
  }

  // habitat temperature
  let target: number;
  if (p.has('heater')) target = C.TEMP_NORMAL;
  else if (lsOk) target = night ? 2 : 12; // algae loop alone barely holds
  else target = night ? -30 : 12;
  s.habTemp += (target - s.habTemp) * C.TEMP_RATE;

  // warnings + emergency countdowns (edge-triggered emergency stat)
  warnAndCount(s, 'o2', s.o2 < C.O2_WARN, s.o2 <= 0, 'cdO2', C.O2_COUNTDOWN,
    '◯', `Oxygen low: ${s.o2.toFixed(1)} kg`, 'Oxygen exhausted — suit reserves only');
  warnAndCount(s, 'co2', s.co2 > C.CO2_WARN, s.co2 >= C.CO2_LETHAL, 'cdCo2', C.CO2_COUNTDOWN,
    '▲', `CO₂ high: ${Math.round(s.co2)} ppm — judgment degrading`, 'CO₂ at lethal concentration');
  warnAndCount(s, 'cold', s.habTemp < C.TEMP_WARN, s.habTemp <= C.TEMP_COLD_LIMIT, 'cdCold', C.TEMP_COUNTDOWN,
    '❄', `Habitat cold: ${s.habTemp.toFixed(1)} °C`, 'Habitat below freezing');
  warnAndCount(s, 'water', s.water < 10, s.water <= 0, 'cdWater', C.WATER_COUNTDOWN,
    '∿', `Water low: ${s.water.toFixed(0)} kg`, 'Water exhausted — crew degrading');
}

function warnAndCount(
  s: SimState, key: string, warn: boolean, critical: boolean,
  cd: 'cdO2' | 'cdCo2' | 'cdCold' | 'cdWater', minutes: number,
  icon: string, warnText: string, critText: string,
): void {
  if (warn) {
    addAlert(s, `warn-${key}`, icon, warnText, 'warn');
  }
  if (critical) {
    if (s[cd] < 0) {
      s[cd] = minutes;
      s.stats.lsEmergencies++;
      s.scores.safety -= 1;
    }
    s[cd] -= 1;
    addAlert(s, `crit-${key}`, icon, `${critText} — ${Math.max(0, Math.ceil(s[cd]))} min to lose the crew`, 'danger');
  } else if (s[cd] >= 0) {
    s[cd] += 0.5; // slow recovery while above threshold
    if (s[cd] >= minutes) s[cd] = -1;
  }
}

// ---- crew ---------------------------------------------------------------

function stepCrew(s: SimState): void {
  for (const m of Object.values(s.crew)) {
    if (m.injuredUntil > s.t || m.busyUntil > s.t) {
      m.fatigue = Math.min(100, Math.max(0, m.fatigue + (m.injuredUntil > s.t ? C.FATIGUE_REST * 0.5 : 0.05)));
      continue;
    }
    if (m.busyLabel && m.busyUntil <= s.t) {
      m.busyLabel = '';
      addRadio(s, m.name, m.id === 'darrin' ? 'Back at the hut. Kessler will make dawn.' : 'Back inside.');
    }
    if (m.assignment === 'rest') {
      let rec = C.FATIGUE_REST;
      if (s.co2 > 3000) rec *= 0.5;
      if (s.water <= 0) rec *= 0.3;
      m.fatigue = Math.max(0, m.fatigue + rec);
      if (m.eva) { m.eva = false; s.o2 = Math.max(0, s.o2 - C.O2_AIRLOCK); s.stats.evaCycles++; }
    } else {
      const evaJob = m.eva;
      m.fatigue = Math.min(100, m.fatigue + (evaJob ? C.FATIGUE_EVA : C.FATIGUE_WORK));
      // accidents
      if (evaJob && m.fatigue > C.FATIGUE_SLOW && chance(s.rng, C.ACCIDENT_RATE)) {
        m.injuredUntil = s.t + C.INJURY_DOWNTIME;
        m.assignment = 'rest';
        m.eva = false;
        s.o2 = Math.max(0, s.o2 - 1);
        s.stats.injuries++;
        s.scores.safety -= 2;
        addAlert(s, `injury-${m.id}-${s.t}`, '✚', `${m.name} hurt in a suit accident — out ${C.INJURY_DOWNTIME} min`, 'danger');
        addRadio(s, m.name, m.id === 'li'
          ? 'Caught my glove on the scoop arm. Taped it. I’m fine. Don’t look at me like that.'
          : 'Tore the outer layer on a bracket. Pressure held. Going inside to patch it properly.');
      }
    }
    if (m.fatigue >= 100) {
      addAlert(s, `exhausted-${m.id}`, '☾', `${m.name} is exhausted — performance badly degraded`, 'warn');
    }
  }

  // surveying
  const surveyor = Object.values(s.crew).find((m) => m.assignment === 'survey' && crewEff(s, m) > 0);
  if (surveyor) {
    if (s.surveyQueue.length === 0) {
      // walk to the nearest unsurveyed tile automatically
      let best = -1; let bd = 1e9;
      for (const t of s.tiles) {
        if (!t.surveyed && t.dist < bd) { bd = t.dist; best = t.i; }
      }
      if (best >= 0) s.surveyQueue.push(best);
    }
    if (s.surveyQueue.length > 0) {
      s.surveyProgress += crewEff(s, surveyor) / C.SURVEY_MINUTES;
      if (s.surveyProgress >= 1) {
        s.surveyProgress = 0;
        const idx = s.surveyQueue.shift()!;
        const tile = s.tiles[idx];
        tile.surveyed = true;
        if (tile.grade >= 5.5) {
          addAlert(s, `rich-${idx}`, '◈', `Survey: ${tile.grade.toFixed(1)} ppb at (${tile.x},${tile.y}) — a rich pocket`, 'info');
        }
      }
    }
  }
}

// ---- crawler ------------------------------------------------------------

function stepCrawler(s: SimState): void {
  const c = s.crawler;
  if (c.phase === 'shipment') return; // handled in stepShipment
  if (s.machines.crawler.broken || c.phase === 'jammed') return;

  const operator = Object.values(s.crew).find((m) => m.assignment === 'sweep' && crewEff(s, m) > 0);
  const night = isNight(s.t);
  const drain = C.CRAWLER_DRAIN * (night ? 1.5 : 1);
  const speed = (c.upgraded ? C.CRAWLER_SPEED_UPG : C.CRAWLER_SPEED) * (operator ? crewEff(s, operator) : 0);
  const cargoCap = c.upgraded ? C.CRAWLER_CARGO_UPG : C.CRAWLER_CARGO;
  const wearRate = c.upgraded ? C.CRAWLER_WEAR_RATE_UPG : C.CRAWLER_WEAR_RATE;

  const atBase = Math.abs(c.x - C.BASE_X) < 0.05 && Math.abs(c.y - C.BASE_Y) < 0.05;

  if (!operator) {
    if ((c.phase === 'toTile' || c.phase === 'sweeping' || c.phase === 'returning') && atBase) c.phase = 'idle';
    return; // nobody driving
  }

  if (c.battery <= 0.5 && !atBase && c.phase !== 'returning') {
    c.phase = 'returning';
    addAlert(s, 'crawler-batt', '▣', 'Crawler battery critical — limping home', 'warn');
  }

  switch (c.phase) {
    case 'idle':
    case 'charging': {
      if (c.battery < C.CRAWLER_BATT * 0.35) { c.phase = 'charging'; break; }
      if (c.cargo > 0.01) { c.phase = 'dumping'; break; }
      if (c.targetTile >= 0) {
        const t = s.tiles[c.targetTile];
        if (t.mass > 0.01) c.phase = 'toTile';
        else { c.targetTile = -1; addAlert(s, 'tile-empty', '◌', 'Sweep zone exhausted — pick a new tile', 'warn'); }
      }
      break;
    }
    case 'toTile': {
      if (c.targetTile < 0) { c.phase = 'returning'; break; }
      const t = s.tiles[c.targetTile];
      moveToward(c, t.x, t.y, speed);
      c.battery = Math.max(0, c.battery - drain);
      if (Math.abs(c.x - t.x) < 0.05 && Math.abs(c.y - t.y) < 0.05) c.phase = 'sweeping';
      break;
    }
    case 'sweeping': {
      if (c.targetTile < 0) { c.phase = 'returning'; break; }
      const t = s.tiles[c.targetTile];
      const eff = crewEff(s, operator) * wearEff(s.machines.crawler.wear);
      const take = Math.min(C.SWEEP_RATE * eff, cargoCap - c.cargo, t.mass);
      if (take > 0) {
        c.cargoGrade = c.cargo + take > 0 ? (c.cargoGrade * c.cargo + t.grade * take) / (c.cargo + take) : t.grade;
        c.cargo += take;
        t.mass -= take;
        s.machines.crawler.wear = Math.min(100, s.machines.crawler.wear + wearRate * t.dust);
        c.battery = Math.max(0, c.battery - drain);
      }
      if (c.cargo >= cargoCap - 0.01 || t.mass <= 0.01) c.phase = 'returning';
      break;
    }
    case 'returning': {
      moveToward(c, C.BASE_X, C.BASE_Y, speed);
      c.battery = Math.max(0, c.battery - drain * 0.8);
      if (Math.abs(c.x - C.BASE_X) < 0.05 && Math.abs(c.y - C.BASE_Y) < 0.05) {
        c.phase = c.cargo > 0.01 ? 'dumping' : 'idle';
      }
      break;
    }
    case 'dumping': {
      const space = s.hopperCap - s.hopper;
      const dump = Math.min(c.cargo, space, 12); // 12 t/min transfer
      if (dump > 0) {
        s.hopperGrade = s.hopper + dump > 0 ? (s.hopperGrade * s.hopper + c.cargoGrade * dump) / (s.hopper + dump) : c.cargoGrade;
        s.hopper += dump;
        c.cargo -= dump;
      } else if (space <= 0.01) {
        addAlert(s, 'hopper-full', '▤', 'Hopper full — extractor is the bottleneck', 'warn');
      }
      if (c.cargo <= 0.01) { c.cargo = 0; c.phase = 'idle'; }
      break;
    }
  }
}

function moveToward(c: { x: number; y: number }, tx: number, ty: number, speed: number): void {
  const dx = tx - c.x;
  const dy = ty - c.y;
  const d = Math.hypot(dx, dy);
  if (d <= speed || d === 0) { c.x = tx; c.y = ty; return; }
  c.x += (dx / d) * speed;
  c.y += (dy / d) * speed;
}

// ---- cableway -----------------------------------------------------------

function stepCableway(s: SimState): void {
  if (!poweredSet(s).has('cableway')) return;
  for (const b of s.buildings) {
    if (b.id !== 'cableway' || b.readyAt > s.t || b.sourceTile === undefined) continue;
    const t = s.tiles[b.sourceTile];
    if (!t || t.mass <= 0) continue;
    const space = s.hopperCap - s.hopper;
    const take = Math.min(0.8, t.mass, space);
    if (take <= 0) continue;
    s.hopperGrade = s.hopper + take > 0 ? (s.hopperGrade * s.hopper + t.grade * take) / (s.hopper + take) : t.grade;
    s.hopper += take;
    t.mass -= take;
  }
}

// ---- extractor ----------------------------------------------------------

function stepExtractor(s: SimState): void {
  s.lastYieldRate = 0;
  const p = poweredSet(s);
  const running = s.extractorOn && p.has('extractor') && !s.machines.extractor.broken
    && s.hopper > 0 && s.t >= s.standDownUntil;
  const off = (s.field - s.fieldOptimal) / C.FIELD_TOLERANCE;

  // crew tuning: an operator chases the hidden sweet spot
  const op = Object.values(s.crew).find((m) => m.assignment === 'extractor' && crewEff(s, m) > 0);
  if (op && running) {
    const rate = 1.4 * crewEff(s, op);
    if (s.field < s.fieldOptimal) s.field = Math.min(s.fieldOptimal, s.field + rate);
    else s.field = Math.max(s.fieldOptimal, s.field - rate);
  }

  if (!running) {
    s.lastPurityTrace = { he3: 0, he4: 0, h2: 0 };
    return;
  }

  const throughput = (s.throughputUpgraded ? C.THROUGHPUT_UPG : C.THROUGHPUT) * wearEff(s.machines.extractor.wear);
  const tons = Math.min(throughput, s.hopper);
  s.hopper -= tons;
  s.stats.tonsProcessed += tons;
  s.tonsSinceDrift += tons;

  const fe = fieldEfficiency(s.field, s.fieldOptimal);
  const crewBonus = op ? 1 + 0.1 * crewEff(s, op) : 1;
  const mg = tons * Math.max(0.5, s.hopperGrade) * C.YIELD_MG_PER_TON_PER_PPB * fe * crewBonus;
  const grams = mg / 1000;
  const offNorm = Math.min(1, Math.abs(off));
  const impRatio = C.IMPURITY_BASE + C.IMPURITY_MISTUNE * offNorm * offNorm;
  s.bottleHe3 += grams;
  s.bottleImp += grams * impRatio;
  s.lastYieldRate = mg;
  s.stats.peakYieldRate = Math.max(s.stats.peakYieldRate, mg);

  // mass-spec trace for the HUD instrument
  s.lastPurityTrace = {
    he3: mg,
    h2: mg * (3 + (off < 0 ? 14 * offNorm : 0)),
    he4: mg * (4 + (off > 0 ? 14 * offNorm : 0)),
  };

  // wear & the drifting sweet spot
  const wearMult = (s.pushRisk && isNight(s.t)) ? 1.6 : 1;
  s.machines.extractor.wear = Math.min(100, s.machines.extractor.wear + C.EXTRACTOR_WEAR_RATE * wearMult);
  if (s.tonsSinceDrift >= C.FIELD_DRIFT_TONS) {
    s.tonsSinceDrift = 0;
    s.fieldOptimal = Math.max(20, Math.min(80, s.fieldOptimal + range(s.rng, -18, 18)));
  }
}

function stepDistiller(s: SimState): void {
  if (!poweredSet(s).has('distiller')) return;
  s.bottleImp = Math.max(s.bottleHe3 * 2.3, s.bottleImp - C.DISTILL_RATE);
  // floor keeps purity ≤ ~30%: fractional distillation, not magic
  if (s.bottleHe3 <= 0) s.bottleImp = Math.max(0, s.bottleImp - C.DISTILL_RATE);
}

// ---- maintenance --------------------------------------------------------

function stepMaintenance(s: SimState): void {
  // solar dust film accumulates whenever the crawler is sweeping nearby (and slowly always)
  const sweeping = s.crawler.phase === 'sweeping';
  s.machines.solar.wear = Math.min(C.SOLAR_DUST_MAX * 100,
    s.machines.solar.wear + C.SOLAR_DUST_RATE * (sweeping ? 2 : 1));

  // repairs
  for (const m of Object.values(s.crew)) {
    if (m.assignment !== 'maintain') continue;
    const eff = crewEff(s, m);
    if (eff <= 0) continue;
    const target = s.machines[m.maintainTarget];
    const bench = hasReady(s, 'bench') && poweredSet(s).has('bench');
    let rate = (bench ? C.REPAIR_RATE_BENCH : C.REPAIR_RATE) * eff;
    if (s.spares <= 0 && m.maintainTarget !== 'solar') rate *= 0.3;
    const before = target.wear;
    target.wear = Math.max(0, target.wear - rate);
    // spares consumption (solar cleaning is free)
    if (m.maintainTarget !== 'solar') {
      const repaired = before - target.wear;
      (s as unknown as { _spareAcc?: number })._spareAcc =
        ((s as unknown as { _spareAcc?: number })._spareAcc ?? 0) + repaired;
      const acc = (s as unknown as { _spareAcc: number })._spareAcc;
      const per = hasReady(s, 'bench') ? C.SPARES_PER_REPAIR * 1.5 : C.SPARES_PER_REPAIR;
      if (acc >= per && s.spares > 0) {
        s.spares -= 1;
        (s as unknown as { _spareAcc: number })._spareAcc = 0;
      }
    }
    if (target.broken && target.wear < 50) {
      if (s.spares >= 1) {
        s.spares -= 1;
        target.broken = false;
        if (m.maintainTarget === 'crawler' && s.crawler.phase === 'jammed') s.crawler.phase = 'returning';
        addAlert(s, `fixed-${m.maintainTarget}-${s.t}`, '✓', `${machineName(m.maintainTarget)} back online`, 'info');
      } else {
        addAlert(s, 'no-spares', '✗', 'No spares — cannot finish the repair', 'danger');
      }
    }
  }

  // breakdowns
  maybeBreak(s, 'extractor', s.extractorOn && s.hopper > 0, s.pushRisk && isNight(s.t) ? 2 : 1);
  maybeBreak(s, 'crawler', s.crawler.phase === 'sweeping' || s.crawler.phase === 'toTile' || s.crawler.phase === 'returning', 1);
  maybeBreak(s, 'recycler', true, 0.5);

  for (const [id, mach] of Object.entries(s.machines)) {
    if (id === 'solar') continue;
    if (mach.wear > C.WEAR_RISK && !mach.broken) {
      addAlert(s, `wear-${id}`, '⚙', `${machineName(id as MachineId)} wear ${Math.round(mach.wear)}% — breakdown risk`, 'warn');
    }
  }
}

function maybeBreak(s: SimState, id: MachineId, active: boolean, mult: number): void {
  const m = s.machines[id];
  if (!active || m.broken || m.wear <= C.WEAR_RISK) return;
  const sev = (m.wear - C.WEAR_RISK) / (100 - C.WEAR_RISK);
  if (chance(s.rng, C.BREAKDOWN_BASE * sev * sev * mult * 60)) {
    m.broken = true;
    s.stats.breakdowns++;
    s.scores.safety -= 1;
    if (id === 'crawler') s.crawler.phase = 'jammed';
    if (id === 'extractor') s.lastYieldRate = 0;
    addAlert(s, `broke-${id}-${s.t}`, '✗', `${machineName(id)} BREAKDOWN — assign repair (needs a spare)`, 'danger');
    addRadio(s, 'Darrin', id === 'extractor'
      ? 'RF housing seized. Dust in the feed bearings. I told you that vibration meant something.'
      : id === 'crawler'
        ? 'Crawler threw a track. It’s not going anywhere until someone walks out there with parts.'
        : 'Recycler tripped out. We’re on tank air until I clear the impeller.');
  }
}

export function machineName(id: MachineId): string {
  return { crawler: 'Crawler', extractor: 'RF extractor', recycler: 'Recycler', solar: 'Solar array' }[id];
}

// ---- economy ------------------------------------------------------------

function stepEconomy(s: SimState): void {
  s.money -= C.EXPENSE_DRIP;
  if (s.money < 0) {
    addAlert(s, 'money-neg', '$', 'Account overdrawn — Helion is watching', 'danger');
  }
}

function stepShipment(s: SimState): void {
  const ps = s.pendingShipment;
  if (ps.active && s.t >= ps.deliverAt && !s.shipped) {
    s.shipped = true;
    s.shippedGrams = ps.grams;
    s.shippedPurity = ps.purity;
    s.shippedWindow = ps.window;
    const value = shipmentValue(ps.grams, ps.purity);
    const payment = ps.window === 'A' ? C.LOAN_PAYMENT : C.LOAN_PAYMENT_LATE;
    s.money += value - payment;
    s.debt = Math.max(0, s.debt - payment);
    s.scores.production += Math.round(ps.grams);
    s.scores.debt += s.money > 100_000 ? 2 : s.money >= 0 ? 1 : -3;
    addAlert(s, 'shipped', '⬆', `Bottle delivered: ${ps.grams.toFixed(1)} g at ${(ps.purity * 100).toFixed(1)}% — $${value.toLocaleString()} minus $${payment.toLocaleString()} loan service`, 'info');
    ps.active = false;
  }
  if (s.crawler.phase === 'shipment' && s.t >= s.crawler.shipmentReturnAt) {
    s.crawler.phase = 'idle';
    s.crawler.x = C.BASE_X;
    s.crawler.y = C.BASE_Y;
  }
}

// ---- loss ---------------------------------------------------------------

function lose(s: SimState, reason: LossReason, detail: string): void {
  if (s.ended) return;
  s.ended = true;
  s.lossReason = reason;
  s.lossDetail = detail;
}

function checkLoss(s: SimState): void {
  if (s.cdCo2 === 0 || (s.cdCo2 > -1 && s.cdCo2 <= 0 && s.co2 >= C.CO2_LETHAL)) {
    lose(s, 'co2', `CO₂ reached ${Math.round(s.co2)} ppm and stayed there. The algae loop never caught up. You both stopped being able to think, then stopped being able to breathe.`);
    return;
  }
  if (s.cdO2 > -1 && s.cdO2 <= 0 && s.o2 <= 0) {
    lose(s, 'o2', 'Oxygen reserves hit zero with the recycler unable to keep pace. Suit bottles bought twenty minutes. It wasn’t enough.');
    return;
  }
  if (s.cdCold > -1 && s.cdCold <= 0 && s.habTemp <= C.TEMP_COLD_LIMIT) {
    lose(s, 'cold', `The hut fell below freezing during lunar night and the heater never came back. At ${s.habTemp.toFixed(0)} °C the algae loop crystallized, and the cold did the rest.`);
    return;
  }
  if (s.cdWater > -1 && s.cdWater <= 0 && s.water <= 0) {
    lose(s, 'dehydration', 'The water loop ran dry. Two days of headaches and slowing thought, and no margin left to fix anything else.');
    return;
  }
  if (s.money < -50_000) {
    lose(s, 'insolvent', 'The account went too far negative. Helion Dynamics froze the claim, called the transit loan, and listed your equipment for salvage. The Moon didn’t care.');
    return;
  }
  if (s.t >= C.HARD_DEADLINE && !s.shipped) {
    lose(s, 'insolvent', 'Both rendezvous windows closed with no bottle on the manifest. The first loan payment came due against an empty account. Helion called the note.');
    return;
  }
  // unserviceable equipment: extractor & crawler both broken, no spares, can't afford any
  const m = s.machines;
  if (m.extractor.broken && m.crawler.broken && s.spares <= 0 && s.money < 9_000 && !s.shipped) {
    lose(s, 'equipment', 'Crawler and RF extractor both down, no spares on the shelf, and no money for a resupply drop. Production is over, and the loan clock isn’t.');
  }
}
