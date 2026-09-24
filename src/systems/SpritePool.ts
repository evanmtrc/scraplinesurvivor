import Phaser from 'phaser';

/** Keeps inactive sprites for reuse. No physics body or per-frame allocation. */
export class SpritePool {
  private readonly items: Phaser.GameObjects.Image[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly texture: string,
    private readonly limit: number,
    private readonly depth: number,
  ) {}

  acquire(x: number, y: number): Phaser.GameObjects.Image | undefined {
    let item = this.items.find(sprite => !sprite.active);
    if (!item) {
      if (this.items.length >= this.limit) return undefined;
      item = this.scene.add.image(x, y, this.texture).setDepth(this.depth);
      this.items.push(item);
    }
    return item.setPosition(x, y).setActive(true).setVisible(true).setAlpha(1).setScale(1);
  }

  release(item: Phaser.GameObjects.Image): void {
    item.setActive(false).setVisible(false);
  }
}
