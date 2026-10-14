import Phaser from 'phaser'
import Player from '../player.js'
import Box, { resolveBoxPushing } from '../box.js'
import DoorSystem from '../door.js'
import EnemySystem from '../enemy.js'
import timer from '../timer.js'
import lives, { INVULNERABLE_MS } from '../lives.js'
import addRestartButton, { syncLives, addFloorLabel, addDebugNext } from '../hud.js'

const PLATFORM_HEIGHT = 32

const LEDGES = [
  { x: 125, y: 416, w: 250 },
  { x: 195, y: 796, w: 250 },
  { x: 650, y: 716, w: 300 },
  { x: 400, y: 566, w: 280 },
]

const FLOOR = { x: 320, y: 944, w: 1040 }

const ZONES = [
  { x: 400, y: 544, w: 56, h: 12, colorId: 'yellow' },
  { x: 530, y: 922, w: 56, h: 12, colorId: 'red' },
]

const DOOR = { x: 785, y: 880, w: 48, h: 96 }

const ENEMY_PATROLS = [{ x: 600, y: 910, left: 600, right: 740, speed: 50 }]

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super('Level1')
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel('Level1')
    this.gameOverTriggered = false
    this.currentTime = 0
    this.timerText = this.add
      .text(this.scale.width - 12, 12, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#efdffc',
      })
      .setScrollFactor(0)
      .setOrigin(1, 0)
    addRestartButton(this)
    addFloorLabel(this, 1)
    addDebugNext(this, () => this.scene.start('Level2'), 'DEBUG: NIVEL 2')

    this.platforms = []
    for (const { x, y, w } of LEDGES) {
      this.buildPlatform(x, y, w, 0x3f3f46, 0x71717a)
    }
    this.buildPlatform(FLOOR.x, FLOOR.y, FLOOR.w, 0x27272a, 0x3f3f46)

    this.player = new Player(this, 125, 284)
    this.boxes = [new Box(this, 60, 370, 'yellow'), new Box(this, 190, 370, 'red')]
    this.cursors = this.input.keyboard.createCursorKeys()
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
    this.heaveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)

    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.collider(this.boxes, this.platforms)
    this.physics.add.collider(this.player, this.boxes)
    this.physics.add.collider(this.boxes, this.boxes)

    this.enemies = new EnemySystem(this, {
      patrols: ENEMY_PATROLS,
      platforms: this.platforms,
      player: this.player,
      attack: this.player.attackRect,
      onHit: () => this.damagePlayer(),
    })

    this.door = new DoorSystem(this, {
      boxes: this.boxes,
      zones: ZONES,
      door: DOOR,
      targetScene: 'Level2',
    })
  }

  buildPlatform(x, y, w, fillColor, strokeColor) {
    const platform = this.add.rectangle(x, y, w, PLATFORM_HEIGHT, fillColor)
    platform.setStrokeStyle(2, strokeColor)
    this.physics.add.existing(platform, true)
    this.platforms.push(platform)
  }

  damagePlayer() {
    if (this.gameOverTriggered) return

    const now = this.currentTime
    if (!this.player.isVulnerable(now)) return

    if (lives.lose() <= 0) {
      this.player.setInvulnerable(now, Number.MAX_SAFE_INTEGER)
      this.die()
      return
    }

    this.player.setInvulnerable(now, INVULNERABLE_MS)
    syncLives(this)
  }

  die() {
    if (this.gameOverTriggered) return
    this.gameOverTriggered = true

    this.physics.pause()
    this.player.setVisible(false)
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('GameOver', { level: 'Level1', floor: 1 })
    })
  }

  update(time) {
    if (this.gameOverTriggered) return
    this.currentTime = time
    this.timerText.setText(timer.format(timer.levelElapsed()))
    this.enemies.update(time)
    this.player.update(this.cursors, { attack: this.attackKey, heave: this.heaveKey, boxes: this.boxes }, time)
    this.boxes.forEach((box) => box.update(this.player, this.scale.width))
    resolveBoxPushing(this.boxes)
    this.door.update(this.player)
  }
}