import Phaser from 'phaser'
import Player from '../player.js'
import Box, { resolveBoxPushing } from '../box.js'
import DoorSystem from '../door.js'
import timer from '../timer.js'
import addRestartButton from '../hud.js'

const PLATFORM_HEIGHT = 32

const LEDGES = [
  { x: 125, y: 406, w: 250 },
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

export default class Level2Scene extends Phaser.Scene {
  constructor() {
    super('Level2')
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel('Level2')
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
      new Box(this, 420, 520, 'purple'),
    ]
    this.cursors = this.input.keyboard.createCursorKeys()

    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.collider(this.boxes, this.platforms)
    this.physics.add.collider(this.player, this.boxes)
    this.physics.add.collider(this.boxes, this.boxes)

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

  update() {
    this.timerText.setText(timer.format(timer.levelElapsed()))
    this.player.update(this.cursors)
    this.boxes.forEach((box) => box.update(this.player, this.scale.width))
    resolveBoxPushing(this.boxes)
    this.door.update(this.player)
  }
}