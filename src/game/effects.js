// Effects advance on the same simulation clock as combat, including pause and 2x speed.
export class CombatEffects {
  constructor(scene) { this.scene = scene; this.items = []; }
  add(sprite, duration, vx = 0, vy = 0, growth = 0) {
    this.items.push({ sprite, duration, life: duration, vx, vy, growth, alpha: sprite.alpha });
    return sprite;
  }
  flash(x, y, color = 0xffd484) {
    this.add(this.scene.add.image(x, y, 'spark').setTint(color).setScale(.9).setDepth(60), .13, 0, 0, 1.6);
  }
  hit(x, y) {
    for (let i = 0; i < 4; i++) {
      const angle = Math.random() * Math.PI * 2;
      this.add(this.scene.add.rectangle(x, y, 2, 2, 0xe7c18d).setDepth(50), .25, Math.cos(angle) * 50, Math.sin(angle) * 50, -1);
    }
  }
  explosion(x, y, radius = 62) {
    this.add(this.scene.add.image(x, y, 'spark').setScale(radius / 10).setDepth(50), .35, 0, 0, 1.5);
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2, velocity = 30 + Math.random() * radius * 1.5;
      this.add(this.scene.add.image(x, y, i % 3 ? 'smoke' : 'spark').setScale(.3 + Math.random() * .5).setDepth(52), .6 + Math.random() * .6, Math.cos(angle) * velocity, Math.sin(angle) * velocity, .9);
    }
    const ring = this.scene.add.circle(x, y, 12, 0xf7d28a, .06).setStrokeStyle(2, 0xf2ce8f, .7).setDepth(49);
    this.add(ring, .45, 0, 0, radius / 5);
  }
  popup(x, y, text, color = '#e9d294') {
    this.add(this.scene.add.text(x, y - 24, text, { fontFamily: 'monospace', fontSize: '13px', fontStyle: 'bold', color, stroke: '#293328', strokeThickness: 3 }).setOrigin(.5).setDepth(80), 1.1, 0, -25);
  }
  update(delta) {
    for (const item of this.items) {
      item.life -= delta;
      if (item.life <= 0) { item.sprite.destroy(); continue; }
      item.sprite.x += item.vx * delta; item.sprite.y += item.vy * delta;
      item.sprite.setAlpha(item.alpha * Math.min(1, item.life / (item.duration * .65)));
      if (item.growth) item.sprite.setScale(Math.max(.01, item.sprite.scaleX + item.growth * delta));
    }
    this.items = this.items.filter(item => item.life > 0);
  }
}
