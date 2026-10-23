import Phaser from 'phaser'
import { BOX_COLORS } from './box.js'

const DOOR_COLORS = { closed: 0x7f1d1d, open: 0x4ade80 }

export default class DoorSystem {
  constructor(scene, { boxes, zones, door, targetScene, targetData, onEnter }) {
    this.scene = scene
    this.boxes = boxes
    this.targetScene = targetScene
    this.targetData = targetData
    this.onEnter = onEnter
    this.doorOpen = false
    this.entered = false

    this.zones = zones.map(({ x, y, w, h, colorId }) => {
      const rect = scene.add.rectangle(x, y, w, h, BOX_COLORS[colorId].fill)
      rect.setStrokeStyle(2, BOX_COLORS[colorId].stroke)
      return { rect, colorId }
    })

    this.door = scene.add.rectangle(
      door.x,
      door.y,
      door.w,
      door.h,
      DOOR_COLORS.closed
    )
    this.door.setStrokeStyle(3, 0x0c0a09)
  }

  // Se usa al cambiar de habitación: destruye sus rects de zonas y puerta.
  destroy() {
    this.zones.forEach(({ rect }) => rect.destroy())
    this.zones = []
    if (this.door) this.door.destroy()
    this.door = null
  }

  update(player) {
    if (this.entered) return

    const allPlaced = this.zones.every((zone) =>
      this.boxes.some(
        (box) =>
          box.colorId === zone.colorId &&
          Phaser.Geom.Rectangle.Overlaps(box.getBounds(), zone.rect.getBounds())
      )
    )

    if (allPlaced !== this.doorOpen) {
      this.doorOpen = allPlaced
      this.door.setFillStyle(allPlaced ? DOOR_COLORS.open : DOOR_COLORS.closed)
    }

    if (
      this.doorOpen &&
      Phaser.Geom.Rectangle.Overlaps(player.getBounds(), this.door.getBounds())
    ) {
      this.entered = true

      if (this.onEnter) {
        this.onEnter()
      } else {
        this.scene.scene.start(this.targetScene, this.targetData)
      }
    }
  }
}