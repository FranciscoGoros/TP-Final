import Phaser from 'phaser'
import Player from '../player.js'
import Box, { resolveBoxPushing } from '../box.js'
import DoorSystem from '../door.js'
import SpikeSystem from '../spikes.js'
import LaserSystem from '../lasers.js'
import EnemySystem from '../enemy.js'
import { LEVELS } from '../levels.js'
import timer from '../timer.js'
import lives, { INVULNERABLE_MS } from '../lives.js'
import addRestartButton, { syncLives, addFloorLabel, updateFloorLabel } from '../hud.js'

const PLATFORM_HEIGHT = 32

// Una sola escena para todo el juego. Las 5 habitaciones se construyen una
// AL LADO de la otra (offset en X); al entrar por la puerta abierta la
// camara panea hacia la derecha donde ya esta armada la siguiente. NO hay
// cambios de escena entre habitaciones: el mundo se desplaza, la camara
// sigue al jugador. Al completar la 5a se va a Victory.
const ROOM_WIDTH = 840
const ASCEND_MS = 1100

export default class GameScene extends Phaser.Scene {
  constructor() {
    super('Game')
  }

  init(data) {
    // Phaser CACHEA settings.data: si hacés scene.start('Game') sin argumentos,
    // el init siguiente recibe los datos del start anterior. Por eso el HUD
    // del reinicio manda `restart: true` para pisar ese cache y poder
    // distinguir: fresh -> entrada nueva (usar data.floor), restart ->
    // reinicio a mitad de habitación (conservar roomIndex actual).
    if (data?.fresh) this.roomIndex = Math.min((data.floor ?? 1) - 1, LEVELS.length - 1)
    else if (!data?.restart) this.roomIndex = 0

    // Cada (re)inicio reconstruye SOLO la habitación actual en el origen de
    // la cámara: la sala de al lado se genera al ascender.
    this.offsetX = 0
    this.ascending = false
  }

  create() {
    this.cameras.main.setBackgroundColor(0x1b1b22)
    timer.startLevel(`Habitacion${this.roomIndex + 1}`)
    // OJO: las vidas NO se reinician acá. Son 3 para toda la partida
    // (se resetean en el menú y en el reintento del Game Over).
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
    addFloorLabel(this, this.roomIndex + 1)

    // Todo lo que se destruye al cambiar de habitación.
    this.roomObjects = []
    this.roomColliders = []
    this.systems = []
    this.platforms = []
    this.boxes = []
    this.door = null

    // La cámara se desplaza varias habitaciones: los límites del mundo
    // tienen que ser amplios o el jugador quedaría encerrado en el borde.
    this.physics.world.setBounds(
      -100,
      -200,
      ROOM_WIDTH * LEVELS.length + 400,
      960 + 600
    )

    this.cursors = this.input.keyboard.createCursorKeys()
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)
    this.heaveKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C)

    this.player = new Player(this, 0, 0)
    this.player.reset(0)

    this.buildRoom(LEVELS[this.roomIndex], 0)

    // El jugador se crea en (0,0) y recién acá lo mandamos al spawn.
    this.player.setPosition(this.room.spawn.x + this.offsetX, this.room.spawn.y)
    this.player.facing = 1
  }

  // ── construcción de una habitación ─────────────────────────────
  buildRoom(level, offsetX) {
    this.room = level
    this.offsetX = offsetX

    for (const { x, y, w } of level.ledges) {
      this.addPlatform(x + offsetX, y, w, 0x3f3f46, 0x71717a)
    }
    this.addPlatform(level.floor.x + offsetX, level.floor.y, level.floor.w, 0x27272a, 0x3f3f46)

    this.boxes = level.boxes.map((b) => {
      const box = new Box(this, b.x + offsetX, b.y, b.colorId)
      this.roomObjects.push(box)
      return box
    })

    this.roomColliders.push(this.physics.add.collider(this.player, this.platforms))
    this.roomColliders.push(this.physics.add.collider(this.boxes, this.platforms))
    this.roomColliders.push(this.physics.add.collider(this.player, this.boxes))
    this.roomColliders.push(this.physics.add.collider(this.boxes, this.boxes))

    const onHit = () => this.damagePlayer()

    if (level.spikes.length) {
      this.systems.push(
        new SpikeSystem(this, {
          strips: level.spikes.map((s) => ({ ...s, x: s.x + offsetX })),
          player: this.player,
          onHit,
        })
      )
    }

    if (level.lasers.length) {
      this.systems.push(
        new LaserSystem(this, {
          beams: level.lasers,
          offsetX,
          player: this.player,
          onHit,
        })
      )
    }

    if (level.enemies.length) {
      this.systems.push(
        new EnemySystem(this, {
          patrols: level.enemies.map((e) => ({ ...e, x: e.x + offsetX, left: e.left + offsetX, right: e.right + offsetX })),
          platforms: this.platforms,
          player: this.player,
          attack: this.player.attackRect,
          onHit,
        })
      )
    }

    // La puerta cierra el puzzle de la habitación; al entrar se asciende
    // (o se termina el juego si es la última).
    this.door = new DoorSystem(this, {
      boxes: this.boxes,
      zones: level.zones.map((z) => ({ ...z, x: z.x + offsetX })),
      door: { ...level.door, x: level.door.x + offsetX },
      onEnter: () => this.ascendToNext(),
    })
    this.roomObjects.push(this.door)
  }

  addPlatform(x, y, w, fillColor, strokeColor) {
    const platform = this.add.rectangle(x, y, w, PLATFORM_HEIGHT, fillColor)
    platform.setStrokeStyle(2, strokeColor)
    this.physics.add.existing(platform, true)
    this.platforms.push(platform)
    this.roomObjects.push(platform)
    return platform
  }

  // ── paso a la siguiente habitación ─────────────────────────────
  ascendToNext() {
    if (this.ascending || this.gameOverTriggered) return

    // Última habitación completada: fin del juego.
    if (this.roomIndex >= LEVELS.length - 1) {
      this.finishGame()
      return
    }

    this.ascending = true

    // La sala vieja NO se destruye todavía: durante el paneo se ven las dos
    // habitaciones lado a lado. Se limpia recién en PAN_COMPLETE.
    const oldSystems = this.systems
    const oldColliders = this.roomColliders
    const oldObjects = this.roomObjects
    this.systems = []
    this.roomColliders = []
    this.roomObjects = []
    this.platforms = []
    this.boxes = []
    this.door = null

    const nextIndex = this.roomIndex + 1
    const nextOffset = this.offsetX + ROOM_WIDTH
    const nextLevel = LEVELS[nextIndex]
    this.buildRoom(nextLevel, nextOffset)

    this.player.setVisible(false)
    this.player.setPosition(nextLevel.spawn.x + nextOffset, nextLevel.spawn.y)
    this.player.setVisible(true)
    this.player.facing = 1
    this.player.setInvulnerable(this.currentTime, 900)

    // OJO: el callback de pan() corre en CADA frame, no al terminar.
    // Para hacer algo una sola vez hay que escuchar PAN_COMPLETE.
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.PAN_COMPLETE, () => {
      oldSystems.forEach((s) => s.destroy())
      oldColliders.forEach((c) => c.destroy())
      oldObjects.forEach((o) => o.destroy())

      this.roomIndex = nextIndex
      this.ascending = false
      updateFloorLabel(this, this.roomIndex + 1)
      timer.startLevel(`Habitacion${this.roomIndex + 1}`)
    })

    this.cameras.main.pan(ROOM_WIDTH / 2 + nextOffset, 480, ASCEND_MS, 'Sine.easeInOut', true)
  }

  finishGame() {
    if (this.gameOverTriggered) return
    this.gameOverTriggered = true

    this.physics.pause()
    this.player.setVisible(false)
    this.cameras.main.fadeOut(400, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Victory')
    })
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
      this.scene.start('GameOver', { level: 'Game', floor: this.roomIndex + 1 })
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

    if (!this.ascending) this.door?.update(this.player)
  }
}
