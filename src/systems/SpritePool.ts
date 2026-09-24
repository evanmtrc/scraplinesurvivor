import Phaser from 'phaser';

/** Keeps inactive sprites for reuse. No physics body or per-frame allocation. */
export class SpritePool {
  private readonly free: Phaser.GameObjects.Image[] = [];
  private allocated=0;

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly texture: string,
    private readonly limit: number,
    private readonly depth: number,
  ) {}

  acquire(x: number, y: number): Phaser.GameObjects.Image | undefined {
    let item = this.free.pop();
    if (!item) {
      if (this.allocated >= this.limit) return undefined;
      item = this.scene.add.image(x, y, this.texture).setDepth(this.depth);
      this.allocated++;
    }
    return item.setPosition(x, y).setActive(true).setVisible(true).setAlpha(1).setScale(1).setRotation(0).clearTint();
  }

  release(item: Phaser.GameObjects.Image): void {
    if(!item.active)return;
    item.setActive(false).setVisible(false);
    this.free.push(item);
  }
}
