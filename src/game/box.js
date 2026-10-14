import Phaser from 'phaser'

const BOX_SIZE = 40
const PUSH_SPEED = 110
const DRAG_X = 600
const EDGE_PADDING = 36

export const BOX_COLORS = {
  yellow: { fill: 0xfacc15, stroke: 0xa16207 },
  red: { fill: 0xef4444, stroke: 0x991b1b },
  purple: { fill: 0xa855f7, stroke: 0x6b21a8 },
  green: { fill: 0x22c55e, stroke: 0x15803d },
  cyan: { fill: 0x22d3ee, stroke: 0x0e7490 },
}

export default class Box extends Phaser.GameObjects.Rectangle {
  constructor(scene, x, y, colorKey = 'yellow') {
    const { fill, stroke } = BOX_COLORS[colorKey]
    super(scene, x, y, BOX_SIZE, BOX_SIZE, fill)
    this.colorId = colorKey
    this.setStrokeStyle(3, stroke)
    scene.add.existing(this)
    scene.physics.add.existing(this)
    this.body.setDragX(DRAG_X)
    this.body.setMaxVelocityX(PUSH_SPEED)
  }

  update(player, worldWidth) {
    const playerPushing = Math.abs(player.body.velocity.x) > 0

    if (playerPushing && this.body.touching.left && player.body.velocity.x > 0) {
      this.body.setVelocityX(PUSH_SPEED)
    } else if (
      playerPushing &&
      this.body.touching.right &&
      player.body.velocity.x < 0
    ) {
      this.body.setVelocityX(-PUSH_SPEED)
    }

    const minX = EDGE_PADDING + BOX_SIZE / 2
    const maxX = worldWidth - EDGE_PADDING - BOX_SIZE / 2
    const clampedX = Phaser.Math.Clamp(this.x, minX, maxX)
    if (clampedX !== this.x) {
      this.x = clampedX
      this.body.setVelocityX(0)
    }
  }
}

export function resolveBoxPushing(boxes) {
  let changed = true
  let guard = 0
  while (changed && guard++ < 50) {
    changed = false
    for (const box of boxes) {
      const vx = box.body.velocity.x
      if (Math.abs(vx) < 1) continue
      const dir = vx > 0 ? 1 : -1

      for (const other of boxes) {
        if (other === box) continue

        const a = box.getBounds()
        const b = other.getBounds()
        if (!Phaser.Geom.Rectangle.Overlaps(a, b)) continue

        const approaching =
          (dir > 0 && b.centerX > a.centerX) ||
          (dir < 0 && b.centerX < a.centerX)
        if (!approaching) continue

        const overlapX =
          Math.min(a.right, b.right) - Math.max(a.left, b.left)
        if (overlapX <= 0) continue

        other.x += dir * (overlapX + 1)
        other.body.x = other.x - BOX_SIZE / 2
        changed = true
      }
    }
  }
  return boxes
}