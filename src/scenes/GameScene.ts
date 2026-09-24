import Phaser from 'phaser';
import { BALANCE as B } from '../data/balance';
import { SpritePool } from '../systems/SpritePool';

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
  private hp = B.player.maxHp;
  private xp = 0;
  private kills = 0;
  private elapsed = 0;
  private spawnClock: number = B.spawn.firstDelay;
  private fireClock = 0.25;
  private invulnerable = 0;
  private ended = false;
  private hud!: Phaser.GameObjects.Text;
  private message!: Phaser.GameObjects.Text;

  constructor() { super('Game'); }

  create(): void {
    this.enemies = []; this.bullets = []; this.gems = [];
    this.hp = B.player.maxHp; this.xp = 0; this.kills = 0; this.elapsed = 0;
    this.spawnClock = B.spawn.firstDelay; this.fireClock = 0.25;
    this.invulnerable = 0; this.ended = false;
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
    this.input.keyboard!.on('keydown-R', this.restartIfEnded, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.keyboard?.off('keydown-R', this.restartIfEnded, this);
    });
    this.hud = this.add.text(18, 16, '', {
      fontFamily: 'monospace', fontSize: '18px', color: '#ecf3e9',
      backgroundColor: '#0a131bc9', padding: { x: 10, y: 7 },
    }).setScrollFactor(0).setDepth(20);
    this.add.text(18, 506, 'WASD / ARROWS  •  MOVE     AUTO-FIRE  •  NEAREST TARGET', {
      fontFamily: 'monospace', fontSize: '14px', color: '#b2c4c0',
      backgroundColor: '#0a131bb8', padding: { x: 8, y: 5 },
    }).setScrollFactor(0).setDepth(20);
    this.message = this.add.text(480, 210, '', {
      fontFamily: 'monospace', fontSize: '27px', align: 'center', color: '#f2efd5',
      backgroundColor: '#09141ae8', padding: { x: 22, y: 16 },
    }).setOrigin(0.5).setScrollFactor(0).setDepth(30).setVisible(false);
    this.updateHud();
  }

  update(_time: number, delta: number): void {
    if (this.ended) return;
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
      this.fireAtNearest();
      this.fireClock = B.pistol.cooldown;
    }
    this.moveEnemies(dt);
    this.moveBullets(dt);
    this.collectGems(dt);
    this.updateHud();
  }

  private movePlayer(dt: number): void {
    const x = Number(this.keys.D.isDown || this.cursors.right.isDown) - Number(this.keys.A.isDown || this.cursors.left.isDown);
    const y = Number(this.keys.S.isDown || this.cursors.down.isDown) - Number(this.keys.W.isDown || this.cursors.up.isDown);
    const length = Math.hypot(x, y) || 1;
    this.player.x = Phaser.Math.Clamp(this.player.x + x / length * B.player.speed * dt, 18, B.worldSize - 18);
    this.player.y = Phaser.Math.Clamp(this.player.y + y / length * B.player.speed * dt, 18, B.worldSize - 18);
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
        this.hp -= B.crawler.contactDamage;
        this.invulnerable = B.player.invulnerability;
        this.cameras.main.shake(90, 0.002);
        if (this.hp <= 0) this.endRun();
      }
    }
  }

  private fireAtNearest(): void {
    let target: Enemy | undefined;
    let closest = B.pistol.range ** 2;
    for (const enemy of this.enemies) {
      const d = distanceSquared(this.player.x, this.player.y, enemy.sprite.x, enemy.sprite.y);
      if (d < closest) { closest = d; target = enemy; }
    }
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
        enemy.hp -= B.pistol.damage;
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
      if (d < B.player.pickupRadius) {
        this.xp += gem.value;
        this.gemPool.release(gem.sprite);
        this.gems.splice(i, 1);
      } else if (d < 92) {
        const step = Math.min(d, 320 * dt);
        gem.sprite.x += dx / d * step;
        gem.sprite.y += dy / d * step;
      }
    }
  }

  private updateHud(): void {
    const time = `${Math.floor(this.elapsed / 60).toString().padStart(2, '0')}:${Math.floor(this.elapsed % 60).toString().padStart(2, '0')}`;
    this.hud.setText(`SCRAPLINE // GRAYBOX     HP ${this.hp}/${B.player.maxHp}     XP ${this.xp}     KILLS ${this.kills}     ${time}`);
  }

  private endRun(): void {
    this.ended = true;
    this.player.setAlpha(1);
    this.message.setText(`RUN ENDED\n${this.kills} kills  •  ${this.xp} XP\nPress R to retry`).setVisible(true);
  }

  private restartIfEnded(): void {
    if (this.ended) this.scene.restart();
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
