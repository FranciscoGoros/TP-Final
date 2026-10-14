import Phaser from 'phaser'

const WARN_MS = 600
const BEAM_WIDTH = 10
const BEAM_ON = 0xff4d4d
const BEAM_WARN = 0xff8800

export default class LaserSystem {
  constructor(scene, { beams, player, onHit }) {
    this.onHit = onHit
    this.player = player
    this.beams = []
    this.scene = scene

    const worldWidth = scene.scale.width

    for (const beam of beams) {
      const fromLeft = beam.side === 'left'
      const cx = fromLeft ? beam.length / 2 : worldWidth - beam.length / 2
      const rect = scene.add.rectangle(cx, beam.levelY, beam.length, BEAM_WIDTH, BEAM_ON)
      rect.setVisible(false)
      scene.physics.add.existing(rect, true)
      rect.body.enable = false
      this.beams.push({ beam, rect })
    }

    scene.physics.add.overlap(this.player, this.beams.map((b) => b.rect), this.onHit)
  }

  update(now) {
    for (const { beam, rect } of this.beams) {
      const cycle = beam.onMs + WARN_MS + beam.offMs
      const t = (now + beam.phase) % cycle
      const warnOn = t < WARN_MS
      const beamOn = t >= WARN_MS && t < WARN_MS + beam.onMs

      if (beamOn) {
        rect.setVisible(true)
        rect.setFillStyle(BEAM_ON)
        rect.body.enable = true
      } else if (warnOn) {
        rect.setFillStyle(BEAM_WARN)
        rect.setVisible(true)
        rect.body.enable = false
      } else {
        rect.setVisible(false)
        rect.body.enable = false
      }
    }
  }
}