import Phaser from 'phaser';
import type { Shell } from '../shell';
import { MAP_W, MAP_H } from '../sim/constants';
import { bakeGround, makeSprites, makePanelArt, makeCanvas } from './art';
import { CUTSCENES } from '../data/cutscenes';

/** Generates every texture locally (no asset loading), then starts the game. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  create(): void {
    const shell = this.registry.get('shell') as Shell;

    this.textures.addCanvas('ground', bakeGround(shell.sim.seed, MAP_W, MAP_H));

    const sprites = makeSprites();
    for (const [k, cv] of Object.entries(sprites)) {
      this.textures.addCanvas(`spr_${k}`, cv);
    }

    // soft dust mote
    const [dust, dg] = makeCanvas(8, 8);
    const grad = dg.createRadialGradient(4, 4, 0, 4, 4, 4);
    grad.addColorStop(0, 'rgba(190,195,205,0.9)');
    grad.addColorStop(1, 'rgba(190,195,205,0)');
    dg.fillStyle = grad;
    dg.fillRect(0, 0, 8, 8);
    this.textures.addCanvas('spr_dust', dust);

    // cutscene panel art (every key referenced by any cutscene)
    const keys = new Set<string>();
    for (const cs of Object.values(CUTSCENES)) {
      for (const p of cs.panels) keys.add(p.art);
    }
    for (const k of keys) this.textures.addCanvas(k, makePanelArt(k));

    this.scene.start('game');
    this.game.events.emit('booted');
  }
}
