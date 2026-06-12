import type { RngState } from './rng';

export interface Tile {
  i: number;
  x: number;
  y: number;
  grade: number; // ppb (display); yield is grade-scaled
  dust: number; // abrasion factor 0.7..1.6
  dist: number; // travel distance from base, tiles
  surveyed: boolean;
  mass: number; // sweepable tons remaining
  disputed: boolean; // Ocean State overlap strip
  rough: boolean; // visual + travel flavor
}

export type CrewId = 'li' | 'darrin';
export type Assignment = 'rest' | 'survey' | 'sweep' | 'extractor' | 'maintain';

export interface CrewMember {
  id: CrewId;
  name: string;
  assignment: Assignment;
  fatigue: number; // 0..100
  injuredUntil: number; // sim minute; 0 = healthy
  busyUntil: number; // away on a narrative errand (e.g. aiding a miner)
  busyLabel: string;
  eva: boolean; // currently suited & outside (airlock O2 accounting)
  /** maintain target machine id, set via UI */
  maintainTarget: MachineId;
}

export type MachineId = 'crawler' | 'extractor' | 'recycler' | 'solar';

export interface Machine {
  wear: number; // 0..100 (for solar this is dust film 0..100)
  broken: boolean;
}

export type CrawlerPhase = 'idle' | 'toTile' | 'sweeping' | 'returning' | 'dumping' | 'charging' | 'shipment' | 'jammed';

export interface CrawlerState {
  phase: CrawlerPhase;
  x: number; // tile coords, fractional while moving
  y: number;
  targetTile: number; // tile index or -1
  cargo: number; // tons
  cargoGrade: number; // weighted avg ppb of cargo
  battery: number; // kWh
  progress: number; // generic phase progress
  upgraded: boolean;
  shipmentReturnAt: number; // sim minute the shipment trip completes
}

export interface Building {
  id: string; // BuildDef id
  tx: number;
  ty: number;
  /** for cableway: source tile index */
  sourceTile?: number;
  /** delivery pending until this sim minute */
  readyAt: number;
}

export interface Alert {
  id: string;
  icon: string; // glyph, never color-only
  text: string;
  severity: 'info' | 'warn' | 'danger';
  t: number;
}

export interface RadioLine {
  speaker: string;
  text: string;
  t: number;
}

export interface Scores {
  production: number;
  safety: number;
  debt: number;
  ethics: number;
}

export type LossReason =
  | 'co2' | 'o2' | 'cold' | 'dehydration' | 'insolvent' | 'equipment';

export interface PendingShipment {
  active: boolean;
  window: 'A' | 'B';
  departAt: number;
  deliverAt: number;
  grams: number;
  purity: number;
}

export interface SimState {
  seed: number;
  rng: RngState;
  t: number; // sim minutes since Tycho arrival
  // power
  battery: number;
  batteryCap: number;
  dischargeLimit: number;
  solarPanels: number;
  gen: number; // last-tick kW for display
  load: number;
  brownout: boolean;
  shed: string[]; // loads shed last tick (display)
  // life support
  o2: number;
  water: number;
  co2: number;
  habTemp: number;
  lsEconomy: boolean; // CO2-climb low power mode
  // countdowns to loss (minutes remaining, -1 = inactive)
  cdO2: number;
  cdCo2: number;
  cdCold: number;
  cdWater: number;
  // materials & product
  spares: number;
  hopper: number;
  hopperGrade: number; // weighted ppb
  hopperCap: number;
  bottleHe3: number; // grams
  bottleImp: number; // grams of other gas
  shipped: boolean;
  shippedGrams: number;
  shippedPurity: number;
  shippedWindow: 'A' | 'B' | '';
  pendingShipment: PendingShipment;
  // extractor
  extractorOn: boolean;
  field: number; // 0..100 player/crew setting
  fieldOptimal: number;
  tonsSinceDrift: number;
  throughputUpgraded: boolean;
  distillerOn: boolean;
  lastYieldRate: number; // mg/min for display + objective
  lastPurityTrace: { he3: number; he4: number; h2: number }; // mass-spec display
  // money
  money: number;
  debt: number;
  // entities
  crawler: CrawlerState;
  buildings: Building[];
  machines: Record<MachineId, Machine>;
  crew: Record<CrewId, CrewMember>;
  tiles: Tile[];
  surveyQueue: number[];
  surveyProgress: number;
  // logs
  alerts: Alert[];
  radio: RadioLine[];
  // stats for mastery/endings
  stats: {
    lsEmergencies: number;
    injuries: number;
    breakdowns: number;
    tonsProcessed: number;
    peakYieldRate: number;
    evaCycles: number;
  };
  scores: Scores;
  // decision effects
  claimDecision: '' | 'strip' | 'respect';
  pushRisk: boolean; // D4: ran the worn extractor through the night
  standDownUntil: number; // D4: extractor offline for maintenance until t
  ended: boolean;
  lossReason: LossReason | null;
  lossDetail: string;
  won: boolean;
}
