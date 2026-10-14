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
  { x: 420, y: 556, w: 280 },
  { x: 720, y: 676, w: 240 },
  { x: 130, y: 776, w: 260 },
  { x: 710, y: 866, w: 260 },
]

const FLOOR = { x: 420, y: 944, w: 840 }

const ZONES = [
  { x: 130, y: 754, w: 56, h: 12, colorId: 'yellow' },
  { x: 730, y: 922, w: 56, h: 12, colorId: 'red' },
  { x: 720, y: 844, w: 56, h: 12, colorId: 'purple' },
]

const DOOR = { x: 490, y: 880, w: 48, h: 96 }

const ENEMY_PATROLS = [
  { x: 620, y: 642, left: 620, right: 810, speed: 55 },
  { x: 570, y: 910, left: 570, right: 690, speed: 50 },
]

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super('Level2')
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel('Level2')
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
    addFloorLabel(this, 2)
    addDebugNext(this, () => this.scene.start('Level3'), 'DEBUG: NIVEL 3')

    this.platforms = []
    for (const { x, y, w } of LEDGES) {
      this.buildPlatform(x, y, w, 0x3f3f46, 0x71717a)
    }
    this.buildPlatform(FLOOR.x, FLOOR.y, FLOOR.w, 0x27272a, 0x3f3f46)

    this.player = new Player(this, 125, 374)
    this.boxes = [
      new Box(this, 60, 370, 'yellow'),
      new Box(this, 190, 370, 'red'),
      new Box(this, 420, 520, 'purple'),
    ]
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
      targetScene: 'Level3',
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
      this.scene.start('GameOver', { level: 'Level2', floor: 2 })
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