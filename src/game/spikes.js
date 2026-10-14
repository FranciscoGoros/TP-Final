import Phaser from 'phaser'

const SPIKE_HEIGHT = 26
const SPIKE_FILL = 0xf87171
const SPIKE_STROKE = 0x991b1b

export default class SpikeSystem {
  constructor(scene, { strips, player, onHit }) {
    const spikes = []
    this.spikes = spikes
    this.overlap = null

    for (const { x, y, w, count } of strips) {
      const tw = w / count
      const startX = x - w / 2
      for (let i = 0; i < count; i++) {
        const cx = startX + tw * (i + 0.5)
        const spike = scene.add.triangle(
          cx,
          y - SPIKE_HEIGHT / 2,
          0,
          -SPIKE_HEIGHT / 2,
          -tw / 2,
          SPIKE_HEIGHT / 2,
          tw / 2,
          SPIKE_HEIGHT / 2,
          SPIKE_FILL
        )
        spike.setStrokeStyle(2, SPIKE_STROKE)
        scene.physics.add.existing(spike, true)
        spikes.push(spike)
      }
    }

    this.overlap = scene.physics.add.overlap(player, spikes, onHit)
  }

  // Se usa al cambiar de habitacion: hay que sacar los cuerpos del mundo.
  destroy() {
    if (this.overlap) this.overlap.destroy()
    this.spikes.forEach((s) => s.destroy())
    this.spikes = []
  }
}