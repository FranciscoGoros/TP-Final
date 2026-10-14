import Phaser from 'phaser'
import Player from '../player.js'
import Box, { resolveBoxPushing } from '../box.js'
import DoorSystem from '../door.js'
import SpikeSystem from '../spikes.js'
import LaserSystem from '../lasers.js'
import EnemySystem from '../enemy.js'
import timer from '../timer.js'
import lives, { INVULNERABLE_MS } from '../lives.js'
import addRestartButton, { syncLives, addFloorLabel, addDebugNext } from '../hud.js'

const PLATFORM_HEIGHT = 32

const LEDGES = [
  { x: 110, y: 406, w: 200 },
  { x: 695, y: 496, w: 190 },
  { x: 180, y: 556, w: 180 },
  { x: 650, y: 646, w: 200 },
  { x: 110, y: 746, w: 150 },
  { x: 550, y: 836, w: 180 },
  { x: 400, y: 700, w: 200 },
]

const FLOOR = { x: 420, y: 944, w: 840 }

const ZONES = [
  { x: 180, y: 534, w: 56, h: 12, colorId: 'yellow' },
  { x: 720, y: 922, w: 56, h: 12, colorId: 'red' },
  { x: 320, y: 922, w: 56, h: 12, colorId: 'purple' },
  { x: 560, y: 922, w: 56, h: 12, colorId: 'green' },
  { x: 550, y: 814, w: 56, h: 12, colorId: 'cyan' },
]

const DOOR = { x: 790, y: 880, w: 48, h: 96 }

const SPIKE_STRIPS = [
  { x: 650, y: 630, w: 110, count: 4 },
  { x: 110, y: 730, w: 90, count: 3 },
]

const LASER_BEAMS = [
  { side: 'right', levelY: 430, length: 460, onMs: 1900, offMs: 1500, phase: 0 },
  { side: 'right', levelY: 510, length: 380, onMs: 2000, offMs: 1500, phase: 450 },
  { side: 'left', levelY: 620, length: 170, onMs: 1900, offMs: 1500, phase: 900 },
  { side: 'right', levelY: 710, length: 200, onMs: 2100, offMs: 1500, phase: 1350 },
  { side: 'left', levelY: 790, length: 240, onMs: 1900, offMs: 1500, phase: 1800 },
]

const ENEMY_PATROLS = [
  { x: 320, y: 666, left: 320, right: 480, speed: 60 },
  { x: 120, y: 910, left: 120, right: 260, speed: 50 },
  { x: 600, y: 910, left: 600, right: 680, speed: 55 },
]

export default class Level5Scene extends Phaser.Scene {
  constructor() {
    super('Level5')
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel('Level5')
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
    addFloorLabel(this, 5)
    addDebugNext(this, () => this.scene.start('Room', { floor: 6, fresh: true }), 'DEBUG: PISO 6')

    this.platforms = []
    for (const { x, y, w } of LEDGES) {
      this.buildPlatform(x, y, w, 0x3f3f46, 0x71717a)
    }
    this.buildPlatform(FLOOR.x, FLOOR.y, FLOOR.w, 0x27272a, 0x3f3f46)

    this.player = new Player(this, 125, 374)
    this.boxes = [
      new Box(this, 60, 370, 'yellow'),
      new Box(this, 190, 370, 'red'),
      new Box(this, 675, 460, 'purple'),
      new Box(this, 750, 460, 'green'),
      new Box(this, 520, 530, 'cyan'),
    ]
    this.cursors = this.input.keyboard.createCursorKeys()
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
    this.heaveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)

    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.collider(this.boxes, this.platforms)
    this.physics.add.collider(this.player, this.boxes)
    this.physics.add.collider(this.boxes, this.boxes)

    const onHit = () => this.damagePlayer()

    this.spikes = new SpikeSystem(this, {
      strips: SPIKE_STRIPS,
      player: this.player,
      onHit,
    })
    this.lasers = new LaserSystem(this, {
      beams: LASER_BEAMS,
      player: this.player,
      onHit,
    })

    this.enemies = new EnemySystem(this, {
      patrols: ENEMY_PATROLS,
      platforms: this.platforms,
      player: this.player,
      attack: this.player.attackRect,
      onHit,
    })

    this.door = new DoorSystem(this, {
      boxes: this.boxes,
      zones: ZONES,
      door: DOOR,
      targetScene: 'Room',
      targetData: { floor: 6, fresh: true },
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
      this.scene.start('GameOver', { level: 'Level5', floor: 5 })
    })
  }

  update(time) {
    if (this.gameOverTriggered) return
    this.currentTime = time
    this.timerText.setText(timer.format(timer.levelElapsed()))
    this.lasers.update(time)
    this.enemies.update(time)
    this.player.update(this.cursors, { attack: this.attackKey, heave: this.heaveKey, boxes: this.boxes }, time)
    this.boxes.forEach((box) => box.update(this.player, this.scale.width))
    resolveBoxPushing(this.boxes)
    this.door.update(this.player)
  }
}