import Phaser from 'phaser'
import Player from '../player.js'
import Box, { resolveBoxPushing } from '../box.js'
import DoorSystem from '../door.js'
import SpikeSystem from '../spikes.js'
import LaserSystem from '../lasers.js'
import timer from '../timer.js'
import addRestartButton from '../hud.js'

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
  { x: 730, y: 922, w: 56, h: 12, colorId: 'red' },
  { x: 520, y: 922, w: 56, h: 12, colorId: 'purple' },
  { x: 320, y: 922, w: 56, h: 12, colorId: 'green' },
]

const DOOR = { x: 790, y: 880, w: 48, h: 96 }

const SPIKE_STRIPS = [
  { x: 650, y: 630, w: 110, count: 4 },
  { x: 110, y: 730, w: 90, count: 3 },
  { x: 550, y: 820, w: 100, count: 4 },
]

const LASER_BEAMS = [
  { side: 'right', levelY: 430, length: 460, onMs: 1800, offMs: 1500, phase: 0 },
  { side: 'right', levelY: 510, length: 380, onMs: 1800, offMs: 1500, phase: 500 },
  { side: 'left', levelY: 620, length: 170, onMs: 1800, offMs: 1500, phase: 1000 },
  { side: 'left', levelY: 790, length: 220, onMs: 1800, offMs: 1500, phase: 1500 },
]

export default class Level4Scene extends Phaser.Scene {
  constructor() {
    super('Level4')
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel('Level4')
    this.gameOverTriggered = false
    this.timerText = this.add
      .text(this.scale.width - 12, 12, '', {
        fontFamily: 'monospace',
        fontSize: '18px',
        color: '#efdffc',
      })
      .setOrigin(1, 0)
    addRestartButton(this)

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
    ]
    this.cursors = this.input.keyboard.createCursorKeys()

    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.collider(this.boxes, this.platforms)
    this.physics.add.collider(this.player, this.boxes)
    this.physics.add.collider(this.boxes, this.boxes)

    const onHit = () => this.onHazardHit()

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

    this.door = new DoorSystem(this, {
      boxes: this.boxes,
      zones: ZONES,
      door: DOOR,
      targetScene: 'Level5',
    })
  }

  buildPlatform(x, y, w, fillColor, strokeColor) {
    const platform = this.add.rectangle(x, y, w, PLATFORM_HEIGHT, fillColor)
    platform.setStrokeStyle(2, strokeColor)
    this.physics.add.existing(platform, true)
    this.platforms.push(platform)
  }

  onHazardHit() {
    if (this.gameOverTriggered) return
    this.gameOverTriggered = true

    this.physics.pause()
    this.player.setVisible(false)
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('GameOver', { level: 'Level4' })
    })
  }

  update(time) {
    if (this.gameOverTriggered) return
    this.timerText.setText(timer.format(timer.levelElapsed()))
    this.lasers.update(time)
    this.player.update(this.cursors)
    this.boxes.forEach((box) => box.update(this.player, this.scale.width))
    resolveBoxPushing(this.boxes)
    this.door.update(this.player)
  }
}