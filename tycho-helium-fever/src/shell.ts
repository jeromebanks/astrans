import type { SimState } from './sim/types';
import type { CampaignState } from './sim/campaign';
import type { ScheduledEvent } from './sim/events';
import type { Settings } from './sim/save';

/** Central mutable context shared by the Phaser scenes and the DOM HUD.
 * The sim is the model; everything here is view/flow state. */
export interface Shell {
  sim: SimState;
  campaign: CampaignState;
  schedule: ScheduledEvent[];
  settings: Settings;
  speed: 0 | 1 | 2 | 4;
  prevSpeed: 1 | 2 | 4;
  /** modal dialogs / cutscenes push pause */
  modalDepth: number;
  cutsceneActive: boolean;
  /** build placement mode: BuildDef id or null */
  placing: string | null;
  selectedTile: number;
  hoverTile: number;
  /** wall-clock accumulator for sim minutes */
  tickAccum: number;
  /** indices for incremental log/alert consumption by the HUD */
  seenAlerts: number;
  seenRadio: number;
  /** set by main: launch a cutscene by id */
  launchCutscene: (id: string) => void;
  /** set by main: called when player clicks a tile (selection already set) */
  refreshUI: () => void;
  paused: () => boolean;
}
