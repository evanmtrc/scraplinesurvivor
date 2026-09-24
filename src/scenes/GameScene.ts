import Phaser from 'phaser';
import { BALANCE as B } from '../data/balance';
import { SpritePool } from '../systems/SpritePool';
import { GameUI } from '../systems/GameUI';
import { Progression, type RunStats, type Upgrade } from '../systems/Progression';
import { selectTarget, TARGET_MODES, type TargetMode } from '../systems/targeting';

type Enemy = { sprite: Phaser.GameObjects.Image; hp: number; flash: number };
type Bullet = { sprite: Phaser.GameObjects.Image; vx: number; vy: number; age: number };
type Gem = { sprite: Phaser.GameObjects.Image; value: number };

const distanceSquared = (ax: number, ay: number, bx: number, by: number): number =>
  (ax - bx) ** 2 + (ay - by) ** 2;

export class GameScene extends Phaser.Scene {
  private player!: Phaser.GameObjects.Image;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private keys!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>;
  private enemyPool!: SpritePool;
  private bulletPool!: SpritePool;
  private gemPool!: SpritePool;
  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private gems: Gem[] = [];
  private stats!: RunStats;
  private progression = new Progression();
  private state: 'running' | 'paused' | 'upgrade' | 'ended' = 'running';
  private targeting: TargetMode = 'Nearest';
  private choices: Upgrade[] = [];
  private ui!: GameUI;
  private xpBar!: Phaser.GameObjects.Graphics;
  private kills = 0;
  private elapsed = 0;
  private spawnClock: number = B.spawn.firstDelay;
  private fireClock = 0.25;
  private invulnerable = 0;
  private hud!: Phaser.GameObjects.Text;

  constructor() { super('Game'); }

  create(): void {
    this.enemies = []; this.bullets = []; this.gems = [];
    this.stats = { damage: B.pistol.damage, cooldown: B.pistol.cooldown, speed: B.player.speed, pickupRadius: B.player.pickupRadius, maxHp: B.player.maxHp, hp: B.player.maxHp };
    this.progression = new Progression(); this.choices = []; this.state = 'running';
    this.kills = 0; this.elapsed = 0;
    this.spawnClock = B.spawn.firstDelay; this.fireClock = 0.25;
    this.invulnerable = 0;
    this.createTextures();
    this.drawWorld();
    this.enemyPool = new SpritePool(this, 'crawler', B.spawn.maxEnemies, 3);
    this.bulletPool = new SpritePool(this, 'bullet', B.limits.bullets, 4);
    this.gemPool = new SpritePool(this, 'gem', B.limits.gems, 2);
    this.player = this.add.image(B.worldSize / 2, B.worldSize / 2, 'player').setDepth(5);
    this.cameras.main.setBounds(0, 0, B.worldSize, B.worldSize);
    this.cameras.main.startFollow(this.player, true, 0.14, 0.14);
    this.cursors = this.input.keyboard!.createCursorKeys();
    this.keys = this.input.keyboard!.addKeys('W,A,S,D') as typeof this.keys;
    this.ui = new GameUI({ pause: () => this.togglePause(), target: () => this.cycleTarget(), restart: () => this.scene.restart() });
    this.ui.setTarget(this.targeting);
    const onKey = (event: KeyboardEvent) => {
      if (event.repeat) return;
      if (event.code === 'Escape' || event.code === 'KeyP') { event.preventDefault(); this.togglePause(); }
      if (event.code === 'KeyT') this.cycleTarget();
      if (event.code === 'KeyR' && this.state === 'ended') this.scene.restart();
      if (this.state === 'upgrade' && ['Digit1', 'Digit2', 'Digit3'].includes(event.code)) this.chooseUpgrade(Number(event.code.slice(-1)) - 1);
    };
    const onBlur = () => { if (this.state === 'running') this.togglePause(); };
    const onVisibility = () => { if (document.hidden) onBlur(); };
    window.addEventListener('keydown', onKey);
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
      this.ui.destroy();
    });
    this.hud = this.add.text(18, 16, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ecf3e9',
      backgroundColor: '#0a131bc9', padding: { x: 10, y: 7 },
    }).setScrollFactor(0).setDepth(20);
    this.add.text(18, 506, 'WASD / ARROWS  •  MOVE', {
      fontFamily: 'monospace', fontSize: '14px', color: '#b2c4c0',
      backgroundColor: '#0a131bb8', padding: { x: 8, y: 5 },
    }).setScrollFactor(0).setDepth(20);
    this.xpBar = this.add.graphics().setScrollFactor(0).setDepth(20);
    this.updateHud();
  }

  update(_time: number, delta: number): void {
    if (this.state !== 'running') return;
    const dt = Math.min(delta / 1000, 0.05); // No large simulation jump after tab suspension.
    this.elapsed += dt;
    this.invulnerable = Math.max(0, this.invulnerable - dt);
    this.player.setAlpha(this.invulnerable > 0 && Math.floor(this.elapsed * 12) % 2 ? 0.45 : 1);
    this.movePlayer(dt);
    this.spawnClock -= dt;
    if (this.spawnClock <= 0) {
      this.spawnEnemy();
      this.spawnClock = Math.max(B.spawn.minimumInterval, B.spawn.initialInterval - this.elapsed * 0.005);
    }
    this.fireClock -= dt;
    if (this.fireClock <= 0) {
      this.fireAtTarget();
      this.fireClock = this.stats.cooldown;
    }
    this.moveEnemies(dt);
    if (this.stats.hp <= 0) { this.updateHud(); return; }
    this.moveBullets(dt);
    this.collectGems(dt);
    this.checkLevelUp();
    this.updateHud();
  }

  private movePlayer(dt: number): void {
    const x = Number(this.keys.D.isDown || this.cursors.right.isDown) - Number(this.keys.A.isDown || this.cursors.left.isDown);
    const y = Number(this.keys.S.isDown || this.cursors.down.isDown) - Number(this.keys.W.isDown || this.cursors.up.isDown);
    const length = Math.hypot(x, y) || 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + x / length * this.stats.speed * dt, 18, B.worldSize - 18);
    this.player.y = Phaser.Math.Clamp(this.player.y + y / length * this.stats.speed * dt, 18, B.worldSize - 18);
  }

  private spawnEnemy(): void {
    if (this.enemies.length >= B.spawn.maxEnemies) return;
    const angle = Math.random() * Math.PI * 2;
    const x = Phaser.Math.Clamp(this.player.x + Math.cos(angle) * B.spawn.distance, 18, B.worldSize - 18);
    const y = Phaser.Math.Clamp(this.player.y + Math.sin(angle) * B.spawn.distance, 18, B.worldSize - 18);
    const sprite = this.enemyPool.acquire(x, y);
    if (sprite) this.enemies.push({ sprite, hp: B.crawler.hp, flash: 0 });
  }

  private moveEnemies(dt: number): void {
    for (const enemy of this.enemies) {
      const dx = this.player.x - enemy.sprite.x;
      const dy = this.player.y - enemy.sprite.y;
      const length = Math.hypot(dx, dy) || 1;
      enemy.sprite.x += dx / length * B.crawler.speed * dt;
      enemy.sprite.y += dy / length * B.crawler.speed * dt;
      enemy.flash = Math.max(0, enemy.flash - dt);
      enemy.sprite.setTint(enemy.flash > 0 ? 0xffffff : 0xc96f60);
      if (length < B.player.radius + B.crawler.radius && this.invulnerable <= 0) {
        this.stats.hp -= B.crawler.contactDamage;
        this.invulnerable = B.player.invulnerability;
        this.cameras.main.shake(90, 0.002);
        if (this.stats.hp <= 0) { this.endRun(); return; }
      }
    }
  }

  private fireAtTarget(): void {
    const target = selectTarget(this.enemies, this.player.x, this.player.y, B.pistol.range, this.targeting);
    if (!target) return;
    const dx = target.sprite.x - this.player.x;
    const dy = target.sprite.y - this.player.y;
    const length = Math.hypot(dx, dy) || 1;
    const sprite = this.bulletPool.acquire(this.player.x, this.player.y);
    if (sprite) this.bullets.push({ sprite, vx: dx / length * B.pistol.speed, vy: dy / length * B.pistol.speed, age: 0 });
  }

  private moveBullets(dt: number): void {
    for (let i = this.bullets.length - 1; i >= 0; i--) {
      const bullet = this.bullets[i];
      bullet.sprite.x += bullet.vx * dt;
      bullet.sprite.y += bullet.vy * dt;
      bullet.age += dt;
      let spent = bullet.age >= B.pistol.lifetime;
      if (!spent) for (let j = this.enemies.length - 1; j >= 0; j--) {
        const enemy = this.enemies[j];
        if (distanceSquared(bullet.sprite.x, bullet.sprite.y, enemy.sprite.x, enemy.sprite.y) > (B.crawler.radius + B.pistol.radius) ** 2) continue;
        enemy.hp -= this.stats.damage;
        enemy.flash = 0.09;
        enemy.sprite.x += bullet.vx * 0.013;
        enemy.sprite.y += bullet.vy * 0.013;
        if (enemy.hp <= 0) this.killEnemy(j);
        spent = true;
        break;
      }
      if (spent) {
        this.bulletPool.release(bullet.sprite);
        this.bullets.splice(i, 1);
      }
    }
  }

  private killEnemy(index: number): void {
    const enemy = this.enemies[index];
    const gem = this.gemPool.acquire(enemy.sprite.x, enemy.sprite.y);
    if (gem) this.gems.push({ sprite: gem, value: B.crawler.xp });
    else if (this.gems.length) {
      // Preserve earned XP when the pickup sprite pool fills.
      let nearest = this.gems[0];
      for (const pickup of this.gems) if (distanceSquared(pickup.sprite.x, pickup.sprite.y, enemy.sprite.x, enemy.sprite.y) < distanceSquared(nearest.sprite.x, nearest.sprite.y, enemy.sprite.x, enemy.sprite.y)) nearest = pickup;
      nearest.value += B.crawler.xp;
    }
    this.enemyPool.release(enemy.sprite);
    this.enemies.splice(index, 1);
    this.kills++;
  }

  private collectGems(dt: number): void {
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const gem = this.gems[i];
      const dx = this.player.x - gem.sprite.x;
      const dy = this.player.y - gem.sprite.y;
      const d = Math.hypot(dx, dy);
      if (d < this.stats.pickupRadius) {
        this.progression.gain(gem.value);
        this.gemPool.release(gem.sprite);
        this.gems.splice(i, 1);
      } else if (d < this.stats.pickupRadius + 64) {
        const step = Math.min(d, 320 * dt);
        gem.sprite.x += dx / d * step;
        gem.sprite.y += dy / d * step;
      }
    }
  }

  private updateHud(): void {
    const time = `${Math.floor(this.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(this.elapsed % 60).toString().padStart(2, '0')}`;
    const p = this.progression;
    this.hud.setText(`SCRAPLINE // LV ${p.level}    HP ${this.stats.hp}/${this.stats.maxHp}    XP ${p.xp}/${p.threshold}    KILLS ${this.kills}    ${time}`);
    this.xpBar.clear().fillStyle(0x0a131b, 0.8).fillRect(18, 57, 924, 4);
    this.xpBar.fillStyle(0x6bd3d0).fillRect(18, 57, 924 * Math.min(1, p.xp / p.threshold), 4);
  }

  private summary(): string {
    return `Level ${this.progression.level} · ${this.kills} kills · ${this.progression.totalXp} XP · ${Math.floor(this.elapsed)} seconds`;
  }

  private togglePause(): void {
    if (this.state === 'running') {
      this.state = 'paused';
      this.cameras.main.shakeEffect.reset();
      this.ui.showPause(this.summary(), this.targeting);
    } else if (this.state === 'paused') {
      this.state = 'running';
      this.ui.hide();
    }
  }

  private cycleTarget(): void {
    if (this.state === 'ended' || this.state === 'upgrade') return;
    this.targeting = TARGET_MODES[(TARGET_MODES.indexOf(this.targeting) + 1) % TARGET_MODES.length];
    this.ui.setTarget(this.targeting);
  }

  private checkLevelUp(): void {
    if (!this.progression.advance()) return;
    this.state = 'upgrade';
    this.cameras.main.shakeEffect.reset();
    this.choices = this.progression.choices(this.stats);
    this.ui.showChoices(this.progression.level, this.choices, index => this.chooseUpgrade(index));
  }

  private chooseUpgrade(index: number): void {
    if (this.state !== 'upgrade' || !this.choices[index]) return;
    this.choices[index].apply(this.stats);
    this.choices = [];
    this.ui.hide();
    this.state = 'running';
    this.checkLevelUp();
    this.updateHud();
  }

  private endRun(): void {
    this.state = 'ended';
    this.player.setAlpha(1);
    this.ui.showEnd(this.summary());
  }

  private drawWorld(): void {
    const graphics = this.add.graphics().setDepth(0);
    graphics.fillStyle(0x1a272c).fillRect(0, 0, B.worldSize, B.worldSize);
    graphics.lineStyle(1, 0x34464b, 0.32);
    for (let n = 0; n <= B.worldSize; n += 64) {
      graphics.lineBetween(n, 0, n, B.worldSize);
      graphics.lineBetween(0, n, B.worldSize, n);
    }
    graphics.lineStyle(5, 0xc88b5b, 0.75).strokeRect(3, 3, B.worldSize - 6, B.worldSize - 6);
    // Fixed procedural dressing; no asset download or collision ambiguity.
    for (let i = 0; i < 170; i++) {
      const x = (i * 587 + 191) % B.worldSize;
      const y = (i * 997 + 431) % B.worldSize;
      graphics.fillStyle(i % 3 ? 0x354547 : 0x755b47, 0.55).fillRect(x, y, 9 + i % 18, 3 + i % 5);
    }
  }

  private createTextures(): void {
    if (this.textures.exists('player')) return;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x6bd3d0).fillCircle(16, 16, 13);
    g.fillStyle(0x173c46).fillCircle(16, 16, 7);
    g.fillStyle(0xffe4a1).fillRect(14, 0, 4, 7);
    g.generateTexture('player', 32, 32); g.clear();
    g.fillStyle(0xc96f60).fillCircle(16, 16, 12);
    g.fillStyle(0x4d2324).fillRect(9, 11, 4, 4).fillRect(19, 11, 4, 4);
    g.generateTexture('crawler', 32, 32); g.clear();
    g.fillStyle(0xffdf83).fillCircle(6, 6, 5);
    g.generateTexture('bullet', 12, 12); g.clear();
    g.fillStyle(0x7cdbdf).fillRect(3, 0, 6, 6).fillRect(0, 3, 12, 6).fillRect(3, 6, 6, 6);
    g.generateTexture('gem', 12, 12); g.destroy();
  }
}
