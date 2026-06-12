/** Central tuning table. Times are sim minutes, energy in kWh, power in kW,
 * masses in kg or tons as noted, He-3 in grams, money in dollars. */

// ---- timeline ----
export const DAY_END = 360; // sunset (sim minutes after Tycho arrival)
export const NIGHT_END = 600; // sunrise
export const SOLAR_RAMP = 20; // minutes of ramp at terminator (rim panels linger)
export const RDV_A_OPEN = 540; // "twenty hours before dawn"
export const RDV_A_CLOSE = 570;
export const RDV_B_OPEN = 760;
export const RDV_B_CLOSE = 790;
export const HARD_DEADLINE = 800; // Helion calls the loan
export const SHIPMENT_TRIP_MIN = 30; // crawler trip to the rendezvous flat

// ---- map ----
export const MAP_W = 16;
export const MAP_H = 10;
export const TILE_MASS = 60; // sweepable tons per tile
export const BASE_X = 7;
export const BASE_Y = 5;
export const BUILD_RADIUS = 3.6; // tiles from base where structures may be placed

// ---- power ----
export const PANEL_KW = 6;
export const START_PANELS = 4;
export const START_BATT_CAP = 60;
export const START_BATT_FRAC = 0.7;
export const BATT_BANK_CAP = 40;
export const BATT_DISCHARGE_BASE = 30; // kW max draw from the starting bank
export const BATT_DISCHARGE_PER_BANK = 20;
export const LOAD_LIFE_SUPPORT = 4;
export const LOAD_LIFE_SUPPORT_LOW = 2.5; // CO2-climb economy mode
export const LOAD_HEATER_DAY = 1;
export const LOAD_HEATER_NIGHT = 8;
export const LOAD_EXTRACTOR_BASE = 10;
export const LOAD_EXTRACTOR_FIELD = 6; // extra at max field strength
export const LOAD_DISTILLER = 4;
export const LOAD_BENCH = 2;
export const LOAD_CABLEWAY = 2;
export const CRAWLER_CHARGE_KW = 8;

// ---- life support ----
export const O2_START = 40; // kg
export const O2_USE = 0.03; // kg/min, both crew, recycler running
export const O2_USE_UNPOWERED = 0.05;
export const O2_AIRLOCK = 0.4; // kg per EVA airlock cycle
export const WATER_START = 80;
export const WATER_USE = 0.05;
export const CO2_NORMAL = 800;
export const CO2_ECONOMY = 4000;
export const CO2_RATE = 28; // ppm/min drift when under/unpowered
export const CO2_RECOVER = 60; // ppm/min recovery when powered
export const CO2_WARN = 6000;
export const CO2_LETHAL = 10000;
export const CO2_COUNTDOWN = 25; // minutes at lethal before loss
export const O2_WARN = 8;
export const O2_COUNTDOWN = 20;
export const TEMP_NORMAL = 21;
export const TEMP_WARN = 5;
export const TEMP_COLD_LIMIT = 0;
export const TEMP_COUNTDOWN = 30;
export const TEMP_RATE = 0.05; // per-minute approach factor toward target
export const WATER_COUNTDOWN = 120;

// ---- crawler ----
export const CRAWLER_BATT = 30; // kWh
export const CRAWLER_DRAIN = 0.15; // kWh per active minute (×1.5 at night)
export const CRAWLER_SPEED = 1 / 1.5; // tiles per minute
export const CRAWLER_SPEED_UPG = 1 / 1.0;
export const CRAWLER_CARGO = 10; // tons
export const CRAWLER_CARGO_UPG = 16;
export const SWEEP_RATE = 2.5; // tons/min
export const CRAWLER_WEAR_RATE = 0.09; // per active minute × tile dust factor
export const CRAWLER_WEAR_RATE_UPG = 0.055;

// ---- extraction ----
export const HOPPER_CAP = 40; // tons
export const HOPPER_EXT = 40;
export const THROUGHPUT = 1.2; // tons/min
export const THROUGHPUT_UPG = 1.8;
export const YIELD_MG_PER_TON_PER_PPB = 60; // compression: grade ppb → mg/ton
export const FIELD_TOLERANCE = 35; // efficiency falloff width
export const FIELD_DRIFT_TONS = 10; // optimal point re-rolls per N tons processed
export const EXTRACTOR_WEAR_RATE = 0.06; // per running minute
export const IMPURITY_BASE = 7; // grams of other gas per gram He3, perfectly tuned
export const IMPURITY_MISTUNE = 20; // extra at worst mistune
export const DISTILL_RATE = 0.35; // grams of impurity vented per minute
export const BOTTLE_MIN_G = 70;
export const BOTTLE_MIN_PURITY = 0.07;
export const SURVEY_MINUTES = 2; // per tile, rested crew

// ---- maintenance ----
export const WEAR_SLOW = 60; // above this, efficiency degrades
export const WEAR_RISK = 75; // above this, breakdown chance accrues
export const BREAKDOWN_BASE = 0.0028; // per min at wear 100
export const REPAIR_RATE = 1.0; // wear points/min, rested crew at machine
export const REPAIR_RATE_BENCH = 1.6;
export const SPARES_START = 5;
export const SPARES_PER_REPAIR = 25; // 1 spare consumed per N wear repaired
export const SOLAR_DUST_RATE = 0.018; // % output lost per minute (dust film)
export const SOLAR_DUST_MAX = 0.35;

// ---- crew ----
export const FATIGUE_WORK = 0.2;
export const FATIGUE_EVA = 0.3;
export const FATIGUE_REST = -0.65;
export const FATIGUE_SLOW = 70; // performance penalty threshold
export const FATIGUE_EFF = 0.6; // efficiency when over threshold
export const ACCIDENT_RATE = 0.002; // per EVA minute when exhausted
export const INJURY_DOWNTIME = 60;

// ---- economy ----
export const MONEY_START = 140_000;
export const DEBT_START = 1_200_000;
export const LOAN_PAYMENT = 240_000; // 20% due at first shipment
export const LOAN_PAYMENT_LATE = 280_000; // window B: extra accrued interest
export const HE3_PRICE_PER_G = 8_000;
export const EXPENSE_DRIP = 50; // $/min Helion claim service + comms
export const DELIVERY_MIN = 25; // Lunar Tug drop pod delay for purchases

export interface BuildDef {
  id: string;
  name: string;
  cost: number;
  desc: string;
  unique?: boolean;
  unlock?: string; // mechanic gate
}

export const BUILDS: BuildDef[] = [
  { id: 'solar', name: 'Solar panel', cost: 12_000, desc: '+6 kW in daylight. Dust film slowly cuts output; brushing it off is a maintenance task.' },
  { id: 'battery', name: 'Battery bank', cost: 18_000, desc: '+40 kWh storage and +20 kW discharge limit. The night is 240 minutes long.' },
  { id: 'hopper', name: 'Hopper extension', cost: 8_000, desc: '+40 t regolith buffer, so sweeping can run ahead of extraction.' },
  { id: 'rf_upgrade', name: 'RF extractor upgrade', cost: 40_000, desc: 'Throughput 1.2 → 1.8 t/min. Draws the same power per ton.', unique: true },
  { id: 'distiller', name: 'Fractional distiller', cost: 60_000, desc: 'Vents ⁴He and hydrogen from the bottle, raising purity toward 30%. 4 kW.', unique: true, unlock: 'distiller' },
  { id: 'bench', name: 'Spare-parts bench', cost: 25_000, desc: 'Repairs run 60% faster and preventive maintenance costs fewer spares.', unique: true },
  { id: 'tank', name: 'O₂/water storage', cost: 15_000, desc: 'Arrives charged: +12 kg oxygen, +60 kg water.' },
  { id: 'recycler', name: 'Improved recycler', cost: 30_000, desc: 'Life support runs on 3 kW (2 kW in economy), and CO₂ recovers faster.', unique: true },
  { id: 'crawler_upgrade', name: 'Crawler refit', cost: 30_000, desc: 'Cargo 10 → 16 t, faster treads, sealed bearings shrug off dust.', unique: true },
  { id: 'cableway', name: 'Cableway segment', cost: 45_000, desc: 'Automated haul line: pick one surveyed tile; bags arrive at 0.8 t/min, no crawler. 2 kW.', unlock: 'cableway' },
];

export const SUPPLIES = [
  { id: 'o2', name: 'Oxygen (10 kg)', cost: 8_000 },
  { id: 'water', name: 'Water (50 kg)', cost: 6_000 },
  { id: 'spares', name: 'Spare parts ×3', cost: 9_000 },
] as const;
