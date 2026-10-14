import Phaser from 'phaser'
import Player from '../player.js'
import Box, { resolveBoxPushing, BOX_COLORS } from '../box.js'
import SpikeSystem from '../spikes.js'
import LaserSystem from '../lasers.js'
import EnemySystem from '../enemy.js'
import generateRoom from '../roomGenerator.js'
import timer from '../timer.js'
import lives, { INVULNERABLE_MS } from '../lives.js'
import addRestartButton, { syncLives, addFloorLabel, updateFloorLabel, addDebugNext } from '../hud.js'

const PLATFORM_HEIGHT = 32

// Una sola escena para toda la carrera. Cuando se resuelve la habitacion
// aparece un ascensor; al pisarlo la camara panea 960px hacia arriba y la
// sala siguiente se construye justo arriba de esta. NO hay puertas ni
// cambios de escena: el mundo se desplaza, la camara sigue al jugador.
const ROOM_HEIGHT = 960
const FIRST_PROCEDURAL_FLOOR = 6
const ASCEND_MS = 1100

const ELEVATOR_W = 64
const ELEVATOR_H = 96
const ELEVATOR_X = 790
const ELEVATOR_Y = 880

export default class RoomScene extends Phaser.Scene {
  constructor() {
    super('Room')
  }

  init(data) {
    // Phaser CACHEA settings.data: si hacés scene.start('Room') sin argumentos,
    // el init siguiente recibe los datos del start anterior (por eso un
    // reinicio en el piso 8 caía al 6, y una bandera `fresh` tampoco servía
    // porque el dato cacheado la traía puesta). Por eso el HUD del reinicio
    // manda `restart: true` para pisar ese cache y poder distinguir:
    //   fresh   -> entrada nueva desde el nivel 5 o el Game Over: usar el dato
    //   restart -> reinicio a mitad de carrera: conservar el piso actual
    if (data?.fresh) this.floor = data.floor
    else if (!data?.restart) this.floor = FIRST_PROCEDURAL_FLOOR

    this.offsetY = 0
    this.solved = false
    this.ascending = false
    this.elevator = null
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel(`Piso${this.floor}`)
    // OJO: las vidas NO se reinicianan acá. Son 3 para toda la partida.
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
    addFloorLabel(this, this.floor)
    // Debug: llama a ascend(), asi panea la camara de verdad.
    addDebugNext(this, () => this.ascend())

    // Todo lo que se destruye al cambiar de habitacion.
    this.roomObjects = []
    this.roomColliders = []
    this.systems = []
    this.platforms = []
    this.boxes = []
    this.zoneRects = []

    // La camara se desplaza varios pisos: los limites del mundo tienen que
    // ser amplios o el jugador quedaria encerrado en el borde.
    this.physics.world.setBounds(-100, -ROOM_HEIGHT - 400, 1040, ROOM_HEIGHT * 6)

    this.cursors = this.input.keyboard.createCursorKeys()
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
    this.heaveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)

    this.player = new Player(this, 0, 0)

    this.buildRoom(generateRoom(this.floor), 0)

    // El jugador se crea en (0,0) y recién acá lo mandamos al spawn.
    this.player.setPosition(this.room.spawn.x, this.room.spawn.y + this.offsetY)
    this.player.facing = 1
  }

  // ── construcción de una habitación ─────────────────────────────
  buildRoom(room, offsetY) {
    this.room = room
    this.offsetY = offsetY

    for (const { x, y, w } of room.ledges) {
      this.addPlatform(x, y + offsetY, w, 0x3f3f46, 0x71717a)
    }
    this.addPlatform(room.floor.x, room.floor.y + offsetY, room.floor.w, 0x27272a, 0x3f3f46)

    this.boxes = room.boxes.map((b) => {
      const box = new Box(this, b.x, b.y + offsetY, b.colorId)
      this.roomObjects.push(box)
      return box
    })

    this.zoneRects = room.zones.map((z) => {
      const rect = this.add.rectangle(
        z.x,
        z.y + offsetY,
        z.w,
        z.h,
        BOX_COLORS[z.colorId].fill
      )
      rect.setStrokeStyle(2, BOX_COLORS[z.colorId].stroke)
      this.roomObjects.push(rect)
      return { rect, colorId: z.colorId }
    })

    this.roomColliders.push(this.physics.add.collider(this.player, this.platforms))
    this.roomColliders.push(this.physics.add.collider(this.boxes, this.platforms))
    this.roomColliders.push(this.physics.add.collider(this.player, this.boxes))
    this.roomColliders.push(this.physics.add.collider(this.boxes, this.boxes))

    const onHit = () => this.damagePlayer()

    if (room.spikes.length) {
      this.systems.push(
        new SpikeSystem(this, {
          strips: room.spikes.map((s) => ({ ...s, y: s.y + offsetY })),
          player: this.player,
          onHit,
        })
      )
    }

    if (room.lasers.length) {
      this.systems.push(
        new LaserSystem(this, {
          beams: room.lasers.map((b) => ({ ...b, levelY: b.levelY + offsetY })),
          player: this.player,
          onHit,
        })
      )
    }

    if (room.enemies.length) {
      this.systems.push(
        new EnemySystem(this, {
          patrols: room.enemies.map((e) => ({ ...e, y: e.y + offsetY })),
          platforms: this.platforms,
          player: this.player,
          attack: this.player.attackRect,
          onHit,
        })
      )
    }
  }

  destroyRoom() {
    this.systems.forEach((s) => s.destroy())
    this.systems = []
    this.roomColliders.forEach((c) => c.destroy())
    this.roomColliders = []
    this.roomObjects.forEach((o) => o.destroy())
    this.roomObjects = []
    this.platforms = []
    this.boxes = []
    this.zoneRects = []
    this.elevator = null
  }

  addPlatform(x, y, w, fillColor, strokeColor) {
    const platform = this.add.rectangle(x, y, w, PLATFORM_HEIGHT, fillColor)
    platform.setStrokeStyle(2, strokeColor)
    this.physics.add.existing(platform, true)
    this.platforms.push(platform)
    this.roomObjects.push(platform)
    return platform
  }

  // ── ascensor ───────────────────────────────────────────────────
  checkSolved() {
    if (this.solved || this.ascending) return

    const allPlaced = this.zoneRects.every(({ rect, colorId }) =>
      this.boxes.some(
        (box) =>
          box.colorId === colorId &&
          Phaser.Geom.Rectangle.Overlaps(box.getBounds(), rect.getBounds())
      )
    )

    if (!allPlaced) return

    this.solved = true
    // Feedback: las zonas quedan marcadas y aparece el ascensor.
    this.zoneRects.forEach(({ rect }) => rect.setStrokeStyle(4, 0x4ade80))
    this.spawnElevator()
  }

  spawnElevator() {
    const pad = this.add
      .rectangle(ELEVATOR_X, ELEVATOR_Y + this.offsetY, ELEVATOR_W, ELEVATOR_H, 0x22d3ee, 0.3)
      .setStrokeStyle(3, 0x0e7490)
    this.physics.add.existing(pad, true)
    this.roomObjects.push(pad)
    this.elevator = pad

    this.roomColliders.push(
      this.physics.add.overlap(this.player, pad, () => this.ascend())
    )
  }

  // ── ascenso: se construye la sala de arriba y la camara la sigue ──
  ascend() {
    if (this.ascending || this.gameOverTriggered) return
    this.ascending = true

    this.player.setVisible(false)
    this.destroyRoom()

    const nextRoom = generateRoom(this.floor + 1)
    const nextOffset = this.offsetY - ROOM_HEIGHT
    this.buildRoom(nextRoom, nextOffset)

    this.player.setPosition(nextRoom.spawn.x, nextRoom.spawn.y + nextOffset)
    this.player.setVisible(true)
    this.player.facing = 1
    this.player.setInvulnerable(this.currentTime, 900)
    this.solved = false

    // OJO: el callback de pan() corre en CADA frame, no al terminar.
    // Para hacer algo una sola vez hay que escuchar PAN_COMPLETE.
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.PAN_COMPLETE, () => {
      this.floor += 1
      this.ascending = false
      this.elevator = null
      updateFloorLabel(this, this.floor)
      timer.startLevel(`Piso${this.floor}`)
    })

    this.cameras.main.pan(420, 480 + nextOffset, ASCEND_MS, 'Sine.easeInOut', true)
  }

  damagePlayer() {
    if (this.gameOverTriggered || this.ascending) return

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
      this.scene.start('GameOver', { level: 'Room', floor: this.floor })
    })
  }

  update(time) {
    if (this.gameOverTriggered) return
    this.currentTime = time

    this.timerText.setText(timer.format(timer.levelElapsed()))
    this.systems.forEach((s) => s.update && s.update(time))

    this.player.update(this.cursors, { attack: this.attackKey, heave: this.heaveKey, boxes: this.boxes }, time)
    this.boxes.forEach((box) => box.update(this.player, this.scale.width))
    resolveBoxPushing(this.boxes)

    if (!this.ascending) this.checkSolved()
  }
}