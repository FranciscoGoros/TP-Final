import Phaser from 'phaser'
import Player from '../player.js'
import Box, { resolveBoxPushing } from '../box.js'
import DoorSystem from '../door.js'
import timer from '../timer.js'
import addRestartButton from '../hud.js'

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

export default class Level1Scene extends Phaser.Scene {
  constructor() {
    super('Level1')
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel('Level1')
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

    this.player = new Player(this, 125, 284)
    this.boxes = [new Box(this, 60, 380, 'yellow'), new Box(this, 190, 380, 'red')]
    this.cursors = this.input.keyboard.createCursorKeys()

    this.physics.add.collider(this.player, this.platforms)
    this.physics.add.collider(this.boxes, this.platforms)
    this.physics.add.collider(this.player, this.boxes)
    this.physics.add.collider(this.boxes, this.boxes)

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

  update() {
    this.timerText.setText(timer.format(timer.levelElapsed()))
    this.player.update(this.cursors)
    this.boxes.forEach((box) => box.update(this.player, this.scale.width))
    resolveBoxPushing(this.boxes)
    this.door.update(this.player)
  }
}