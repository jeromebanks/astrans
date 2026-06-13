import './styles.css';
import Phaser from 'phaser';
import { createSim, tick } from './sim/sim';
import { createCampaign, completeCutscene, updateCampaign, ACT_ORDER } from './sim/campaign';
import { buildSchedule, dueEvent, resolveEvent } from './sim/events';
import { fireDialogue } from './data/dialogue';
import {
  loadGame, saveGame, clearSave, loadSettings, saveSettings, loadBest,
} from './sim/save';
import type { Shell } from './shell';
import { BootScene } from './game/BootScene';
import { GameScene } from './game/GameScene';
import { CutsceneScene } from './game/CutsceneScene';
import { audio } from './game/audio';
import {
  initHUD, updateHUD, refreshTilePanel, tryPlace, showEventCard, showEndScreen, toast,
} from './ui/hud';

const DPR = Math.min(2, window.devicePixelRatio || 1);

let game: Phaser.Game | null = null;
let shell: Shell | null = null;
let endShown = false;
let lastAutosave = 0;

// ----------------------------------------------------------------- title

function showTitle(): void {
  const save = loadGame();
  const best = loadBest();
  const settings = loadSettings();
  const t = document.createElement('div');
  t.id = 'title';
  t.innerHTML = `
    <h1>TYCHO<small>HELIUM FEVER</small></h1>
    <p class="sub">Two people, one crawler, one RF extractor, and a $1.2M transit loan,
      at the bottom of a crater the rest of the Moon thinks is too far and too poor.
      Fill one bottle. Survive one night. An unofficial adaptation of <i>Astrans</i>.</p>
    <div class="menu">
      ${save ? `<button id="t-continue" type="button">CONTINUE — ${actLabel(save.campaign.act)}</button>` : ''}
      <button id="t-new" type="button">${save ? 'NEW RUN (abandons saved operation)' : 'BEGIN OPERATION'}</button>
    </div>
    ${best ? `<div class="best">Best result: ${best.won ? `WIN — ${best.grams.toFixed(0)} g @ ${(best.purity * 100).toFixed(1)}% · $${best.money.toLocaleString()} · ${best.masteries.length}/5 mastery` : 'no successful shipment yet'}</div>` : ''}
    <div class="settings">
      <label>Volume <input id="t-vol" type="range" min="0" max="1" step="0.05" value="${settings.volume}"></label>
      <label><input id="t-amb" type="checkbox" ${settings.ambient ? 'checked' : ''}> Ambient sound</label>
    </div>`;
  document.body.appendChild(t);

  const vol = t.querySelector<HTMLInputElement>('#t-vol')!;
  const amb = t.querySelector<HTMLInputElement>('#t-amb')!;
  const persist = (): void => saveSettings({ volume: Number(vol.value), ambient: amb.checked });
  vol.onchange = persist;
  amb.onchange = persist;

  t.querySelector<HTMLButtonElement>('#t-continue')?.addEventListener('click', () => {
    audio.ensure();
    t.remove();
    startGame(true);
  });
  t.querySelector<HTMLButtonElement>('#t-new')!.addEventListener('click', () => {
    audio.ensure();
    clearSave();
    t.remove();
    startGame(false);
  });
}

function actLabel(act: string): string {
  return {
    tokaplex: 'Act I', recruit: 'Act II', ballcrater: 'Act III', tycho: 'Act IV — the operation',
    night: 'Act V — lunar night', shipment: 'Act VI — rendezvous', epilogue: 'Epilogue',
  }[act] ?? act;
}

// ----------------------------------------------------------------- start

function startGame(fromSave: boolean): void {
  const settings = loadSettings();
  audio.volume = settings.volume;
  audio.ambient = settings.ambient;
  audio.setVolume(settings.ambient ? settings.volume : 0);

  const save = fromSave ? loadGame() : null;
  const sim = save ? save.sim : createSim((Date.now() ^ (Math.random() * 0xffff)) >>> 0 || 1);
  const campaign = save ? save.campaign : createCampaign();

  shell = {
    sim,
    campaign,
    schedule: buildSchedule(sim.seed),
    settings,
    speed: 1,
    prevSpeed: 1,
    modalDepth: 0,
    cutsceneActive: false,
    placing: null,
    selectedTile: -1,
    hoverTile: -1,
    tickAccum: 0,
    seenAlerts: sim.alerts.length, // don't re-toast restored alerts
    seenRadio: 0, // do re-show the radio log: it's the story so far
    launchCutscene,
    refreshUI: () => {
      if (!shell) return;
      if (shell.placing) { tryPlace(shell, shell.selectedTile); shell.selectedTile = -1; return; }
      refreshTilePanel(shell);
    },
    paused: () => {
      if (!shell) return true;
      if (shell.speed === 0 || shell.modalDepth > 0 || shell.cutsceneActive || shell.sim.ended) return true;
      // intro acts: the operation hasn't begun
      const i = ACT_ORDER.indexOf(shell.campaign.act);
      if (i < ACT_ORDER.indexOf('tycho')) return true;
      if (shell.campaign.act === 'tycho' && shell.campaign.pendingCutscene === 'cs_tycho') return true;
      return false;
    },
  };
  endShown = false;
  // debug hook (also used by the automated smoke test)
  (window as unknown as Record<string, unknown>).__thf = shell;

  initHUD(shell);

  game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'phaser-root',
    backgroundColor: '#05070c',
    scale: {
      mode: Phaser.Scale.NONE,
      width: window.innerWidth * DPR,
      height: window.innerHeight * DPR,
      zoom: 1 / DPR,
    },
    render: { roundPixels: true, antialias: true },
    scene: [BootScene, GameScene, CutsceneScene],
    callbacks: {
      preBoot: (g) => {
        g.registry.set('shell', shell);
        g.registry.set('dpr', DPR);
      },
    },
  });

  window.addEventListener('resize', () => {
    game?.scale.resize(window.innerWidth * DPR, window.innerHeight * DPR);
  });

  game.events.on('booted', () => {
    // resume (or begin) the pending narrative beat
    if (shell?.campaign.pendingCutscene) launchCutscene(shell.campaign.pendingCutscene);
  });
  game.events.on(Phaser.Core.Events.STEP, (_t: number, delta: number) => mainStep(delta));

  window.addEventListener('beforeunload', () => {
    if (shell && shell.sim.t > 0 && !shell.sim.ended) saveGame(shell.sim, shell.campaign);
  });
  window.addEventListener('thf-newrun', () => {
    clearSave();
    location.reload();
  });
  // first user gesture unlocks audio
  window.addEventListener('pointerdown', () => audio.ensure(), { once: true });
}

// ----------------------------------------------------------------- loop

function mainStep(deltaMs: number): void {
  if (!shell) return;
  const s = shell.sim;

  if (!shell.paused()) {
    shell.tickAccum = Math.min(shell.tickAccum + (deltaMs / 1000) * shell.speed, 6);
    while (shell.tickAccum >= 1 && !s.ended) {
      shell.tickAccum -= 1;
      tick(s);
      fireDialogue(s, shell.campaign);
    }

    // events pause the sim while their card is open
    if (shell.modalDepth === 0 && !s.ended) {
      const card = dueEvent(shell.schedule, s, shell.campaign);
      if (card) {
        const sh = shell;
        showEventCard(sh, card.title, card.speaker, card.body(s, sh.campaign), card.options, (choice) => {
          resolveEvent(card, sh.sim, sh.campaign, choice);
          saveGame(sh.sim, sh.campaign);
        });
      }
    }

    for (const sig of updateCampaign(shell.campaign, s)) {
      if (sig.kind === 'cutscene') {
        saveGame(s, shell.campaign);
        launchCutscene(sig.id);
      } else if (sig.kind === 'end' && !endShown) {
        endShown = true;
        clearSave(); // the run is over; the result goes to best-results
        showEndScreen(shell);
      }
    }

    // autosave every 10 wall seconds during play
    const now = performance.now();
    if (now - lastAutosave > 10_000 && s.t > 0 && !s.ended) {
      lastAutosave = now;
      saveGame(s, shell.campaign);
      flashSaved();
    }
  } else if (shell.sim.ended && !endShown && !shell.cutsceneActive && shell.modalDepth === 0) {
    // loss detected while paused-by-end: surface it
    for (const sig of updateCampaign(shell.campaign, shell.sim)) {
      if (sig.kind === 'end') {
        endShown = true;
        clearSave();
        showEndScreen(shell);
      }
    }
  }

  updateHUD(shell);
}

function flashSaved(): void {
  const e = document.getElementById('saveflash');
  if (!e) return;
  e.textContent = '● saved';
  setTimeout(() => { e.textContent = ''; }, 1400);
}

// ----------------------------------------------------------------- cutscenes

function launchCutscene(id: string): void {
  if (!shell || !game) return;
  if (shell.cutsceneActive) return;
  shell.cutsceneActive = true;
  shell.placing = null;
  shell.selectedTile = -1;
  refreshTilePanel(shell);
  const gs = game.scene.getScene('game');
  gs.scene.launch('cutscene', {
    id,
    onDone: (doneId: string) => {
      if (!shell) return;
      completeCutscene(shell.campaign, doneId);
      shell.cutsceneActive = false;
      saveGame(shell.sim, shell.campaign);
      // intro acts chain straight into the next cutscene
      if (shell.campaign.pendingCutscene) {
        launchCutscene(shell.campaign.pendingCutscene);
        return;
      }
      if (doneId === 'cs_tycho') {
        toast(shell, '▸', 'The operation is yours. Survey, sweep, extract. Sunset at 06:00.', 'info');
      }
      if (doneId === 'cs_epilogue' && !endShown) {
        endShown = true;
        clearSave();
        showEndScreen(shell);
      }
    },
  });
}

// ----------------------------------------------------------------- boot

showTitle();
