import Phaser from 'phaser'

const ENEMY_SIZE = 36
const DEFAULT_SPEED = 55
const ENEMY_FILL = 0xf472b6
const ENEMY_STROKE = 0x9d174d
const DEATH_FADE_MS = 180

export default class EnemySystem {
  constructor(scene, { patrols, platforms, player, attack, onHit }) {
    this.scene = scene
    this.enemies = []
    this.ghosts = []
    this.lastNow = 0

    const bodies = []

    for (const p of patrols) {
      const speed = p.speed ?? DEFAULT_SPEED
      const dir = p.dir ?? 1

      const rect = scene.add.rectangle(p.x, p.y, ENEMY_SIZE, ENEMY_SIZE, ENEMY_FILL)
      rect.setStrokeStyle(3, ENEMY_STROKE)

      scene.physics.add.existing(rect)
      rect.body.setMaxVelocityX(speed)
      rect.body.setVelocityX(dir * speed)

      this.enemies.push({
        rect,
        dir,
        speed,
        left: p.left,
        right: p.right,
        alive: true,
      })
      bodies.push(rect)
    }

    // Los enemigos se apoyan en las plataformas como cualquier cuerpo dinamico.
    // NO colisionan con cajas ni con el jugador: el contacto es solo overlap
    // (igual que las púas), así nunca vuelven irresoluble un nivel.
    if (bodies.length && platforms) scene.physics.add.collider(bodies, platforms)

    this.overlaps = []
    this.overlaps.push(scene.physics.add.overlap(player, bodies, onHit))
    if (attack) {
      this.overlaps.push(scene.physics.add.overlap(attack, bodies, (a, b) => this.kill(a, b)))
    }
  }

  // Al cambiar de habitacion hay que sacar cuerpos y overlaps del mundo.
  destroy() {
    this.overlaps.forEach((o) => o && o.destroy())
    this.overlaps = []
    this.enemies.forEach((e) => {
      if (e.rect && e.rect.scene) e.rect.destroy()
    })
    this.ghosts.forEach((g) => g.rect.destroy())
    this.enemies = []
    this.ghosts = []
  }

  update(now) {
    this.lastNow = now

    for (const enemy of this.enemies) {
      if (!enemy.alive) continue

      if (enemy.rect.x >= enemy.right && enemy.dir > 0) {
        enemy.dir = -1
        enemy.rect.body.setVelocityX(-enemy.speed)
      } else if (enemy.rect.x <= enemy.left && enemy.dir < 0) {
        enemy.dir = 1
        enemy.rect.body.setVelocityX(enemy.speed)
      }
    }

    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const ghost = this.ghosts[i]
      const t = (now - ghost.born) / DEATH_FADE_MS

      if (t >= 1) {
        ghost.rect.destroy()
        this.ghosts.splice(i, 1)
        continue
      }
      ghost.rect.setAlpha(0.55 * (1 - t))
      ghost.rect.setScale(1 + 0.6 * t)
    }
  }

  kill(a, b) {
    const enemy = this.enemies.find((e) => e.rect === a || e.rect === b)
    if (!enemy || !enemy.alive) return

    enemy.alive = false
    enemy.rect.body.enable = false

    const { x, y } = enemy.rect
    const ghost = this.scene.add
      .rectangle(x, y, ENEMY_SIZE, ENEMY_SIZE, ENEMY_FILL, 0.55)
      .setStrokeStyle(2, ENEMY_STROKE)
    this.ghosts.push({ rect: ghost, born: this.lastNow })

    enemy.rect.destroy()
  }
}