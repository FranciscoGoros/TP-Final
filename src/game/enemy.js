import Phaser from 'phaser'

const ENEMY_SIZE = 36
const DEFAULT_SPEED = 55
const ENEMY_FILL = 0xf472b6
const ENEMY_STROKE = 0x9d174d
const DEATH_FADE_MS = 180

// Configuración del indicador
const INDICATOR_COLOR = 0xff0000
const INDICATOR_OFFSET_Y = 22 // Distancia por encima del enemigo

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

      // Creamos el triángulo y le aplicamos el color y la profundidad por separado
      const indicator = scene.add.triangle(
        p.x,
        p.y - (ENEMY_SIZE / 2) - INDICATOR_OFFSET_Y,
        -8, -8, // Vértice superior izquierdo
         8, -8, // Vértice superior derecho
         0,  4  // Vértice inferior (punta hacia abajo)
      )
      indicator.setFillStyle(INDICATOR_COLOR)
      indicator.setDepth(100) // Asegura que se dibuje por encima de todo

      scene.physics.add.existing(rect)
      rect.body.setMaxVelocityX(speed)
      rect.body.setVelocityX(dir * speed)

      this.enemies.push({
        rect,
        indicator,
        dir,
        speed,
        left: p.left,
        right: p.right,
        alive: true,
      })
      bodies.push(rect)
    }

    if (bodies.length && platforms) scene.physics.add.collider(bodies, platforms)

    this.overlaps = []
    this.overlaps.push(scene.physics.add.overlap(player, bodies, onHit))
    if (attack) {
      this.overlaps.push(scene.physics.add.overlap(attack, bodies, (a, b) => this.kill(a, b)))
    }
  }

  destroy() {
    this.overlaps.forEach((o) => o && o.destroy())
    this.overlaps = []
    this.enemies.forEach((e) => {
      if (e.rect && e.rect.scene) e.rect.destroy()
      if (e.indicator && e.indicator.scene) e.indicator.destroy()
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

      // Sincronizar posición del triángulo con el enemigo
      if (enemy.indicator) {
        enemy.indicator.setPosition(
          enemy.rect.x,
          enemy.rect.y - (ENEMY_SIZE / 2) - INDICATOR_OFFSET_Y
        )
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

    if (enemy.indicator) {
      enemy.indicator.destroy()
    }

    const { x, y } = enemy.rect
    const ghost = this.scene.add
      .rectangle(x, y, ENEMY_SIZE, ENEMY_SIZE, ENEMY_FILL, 0.55)
      .setStrokeStyle(2, ENEMY_STROKE)
    this.ghosts.push({ rect: ghost, born: this.lastNow })

    enemy.rect.destroy()
  }
}