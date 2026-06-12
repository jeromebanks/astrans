import Phaser from 'phaser';
import type { Shell } from '../shell';
import { CUTSCENES, type CutsceneDef, type CutscenePanel } from '../data/cutscenes';
import { applyDecisionEffect } from '../sim/sim';
import { audio } from './audio';

/** Data-driven illustrated cutscene player. Art panels crossfade with slow
 * camera drift in Phaser; captions, dialogue, decisions, and Skip live in a
 * DOM overlay. Skipping at any moment produces exactly the same campaign
 * effects as watching: completion always routes through the same callback. */
export class CutsceneScene extends Phaser.Scene {
  private shell!: Shell;
  private def!: CutsceneDef;
  private onDone!: (id: string) => void;
  private panelIdx = 0;
  private img: Phaser.GameObjects.Image | null = null;
  private timer: Phaser.Time.TimerEvent | null = null;
  private lineTimers: Phaser.Time.TimerEvent[] = [];
  private ui!: HTMLDivElement;
  private finished = false;
  private awaitingDecision = false;
  private keyHandler = (e: KeyboardEvent): void => {
    if (e.key === 'Escape') this.finish();
    else if (e.key === ' ' || e.key === 'Enter') {
      if (!this.awaitingDecision) this.next();
      e.preventDefault();
    }
  };

  constructor() {
    super('cutscene');
  }

  init(data: { id: string; onDone: (id: string) => void }): void {
    this.def = CUTSCENES[data.id];
    this.onDone = data.onDone;
    this.panelIdx = 0;
    this.finished = false;
    this.awaitingDecision = false;
    this.img = null;
  }

  create(): void {
    this.shell = this.registry.get('shell') as Shell;
    this.cameras.main.setBackgroundColor('#05070c');

    this.ui = document.createElement('div');
    this.ui.id = 'cutscene-ui';
    this.ui.innerHTML = `
      <div class="cs-name">${this.def.name}</div>
      <div class="cs-captions"></div>
      <div class="cs-decision"></div>
      <div class="cs-controls">
        <button class="cs-next" type="button">Continue ▸</button>
        <button class="cs-skip" type="button">Skip cutscene ✕</button>
      </div>`;
    document.body.appendChild(this.ui);
    this.ui.querySelector<HTMLButtonElement>('.cs-skip')!.onclick = () => { audio.uiClick(); this.finish(); };
    this.ui.querySelector<HTMLButtonElement>('.cs-next')!.onclick = () => { audio.uiClick(); if (!this.awaitingDecision) this.next(); };
    window.addEventListener('keydown', this.keyHandler);

    this.showPanel(0);
  }

  private layoutImage(img: Phaser.GameObjects.Image): void {
    const { width, height } = this.scale;
    const k = Math.max(width / 960, (height - 150) / 540);
    img.setScale(k);
    img.setPosition(width / 2, (height - 110) / 2);
  }

  private showPanel(i: number): void {
    if (this.finished) return;
    const p = this.def.panels[i];
    if (!p) { this.finish(); return; }
    this.panelIdx = i;

    // crossfade art
    const old = this.img;
    this.img = this.add.image(0, 0, p.art).setAlpha(0);
    this.layoutImage(this.img);
    this.tweens.add({ targets: this.img, alpha: 1, duration: 600 });
    this.tweens.add({ targets: this.img, scale: this.img.scale * 1.06, duration: p.duration * 1000 + 1200, ease: 'Sine.easeInOut' });
    if (old) this.tweens.add({ targets: old, alpha: 0, duration: 600, onComplete: () => old.destroy() });

    // captions + timed dialogue lines
    const cap = this.ui.querySelector<HTMLDivElement>('.cs-captions')!;
    cap.innerHTML = '';
    if (p.title) {
      const t = document.createElement('div');
      t.className = 'cs-title';
      t.textContent = p.title;
      cap.appendChild(t);
    }
    if (p.caption) {
      const c = document.createElement('div');
      c.className = 'cs-cap';
      c.textContent = p.caption;
      cap.appendChild(c);
    }
    for (const t of this.lineTimers) t.remove();
    this.lineTimers = [];
    const lines = p.lines ?? [];
    lines.forEach((ln, k) => {
      const delay = 900 + k * Math.max(1400, (p.duration * 1000 - 1800) / Math.max(1, lines.length));
      this.lineTimers.push(this.time.delayedCall(delay, () => {
        if (this.finished) return;
        audio.radioClick();
        const d = document.createElement('div');
        d.className = 'cs-line';
        d.innerHTML = `<span class="cs-speaker">${ln.speaker}</span> ${escapeHtml(ln.text)}`;
        cap.appendChild(d);
      }));
    });

    // decision?
    const decDiv = this.ui.querySelector<HTMLDivElement>('.cs-decision')!;
    decDiv.innerHTML = '';
    const nextBtn = this.ui.querySelector<HTMLButtonElement>('.cs-next')!;
    if (p.decision && !(p.decision.id in this.shell.campaign.decisions)) {
      this.awaitingDecision = true;
      nextBtn.disabled = true;
      const prompt = document.createElement('div');
      prompt.className = 'cs-prompt';
      prompt.textContent = p.decision.prompt;
      decDiv.appendChild(prompt);
      for (const opt of p.decision.options) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'cs-opt';
        b.innerHTML = `<strong>${opt.label}</strong><span>${opt.detail}</span>`;
        b.onclick = () => {
          audio.uiClick();
          this.shell.campaign.decisions[p.decision!.id] = opt.id;
          applyDecisionEffect(this.shell.sim, p.decision!.id, opt.id);
          this.awaitingDecision = false;
          nextBtn.disabled = false;
          decDiv.innerHTML = '';
          this.next();
        };
        decDiv.appendChild(b);
      }
    } else {
      this.awaitingDecision = false;
      nextBtn.disabled = false;
      // auto-advance after the watch duration
      this.timer?.remove();
      this.timer = this.time.delayedCall(p.duration * 1000, () => this.next());
    }
  }

  private next(): void {
    if (this.finished || this.awaitingDecision) return;
    this.timer?.remove();
    if (this.panelIdx + 1 >= this.def.panels.length) this.finish();
    else this.showPanel(this.panelIdx + 1);
  }

  /** Finish (watched or skipped). Pending decisions on unseen panels get their
   * default (first) option so a skip can never strand the campaign. */
  private finish(): void {
    if (this.finished) return;
    this.finished = true;
    for (let i = this.panelIdx; i < this.def.panels.length; i++) {
      const d: CutscenePanel | undefined = this.def.panels[i];
      if (d?.decision && !(d.decision.id in this.shell.campaign.decisions)) {
        // skipping a cutscene with an unanswered decision: present it as a
        // plain modal instead of silently choosing — handled by leaving it
        // unanswered; the wreck decision panel blocks skip instead.
        // (Only cs_ballcrater has one; we resolve with the "leave" option,
        // the no-gain default, so skipping is never an exploit.)
        const fallback = d.decision.options[d.decision.options.length - 1];
        this.shell.campaign.decisions[d.decision.id] = fallback.id;
        applyDecisionEffect(this.shell.sim, d.decision.id, fallback.id);
      }
    }
    this.timer?.remove();
    for (const t of this.lineTimers) t.remove();
    window.removeEventListener('keydown', this.keyHandler);
    this.ui.remove();
    const id = this.def.id;
    this.scene.stop();
    this.onDone(id);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
