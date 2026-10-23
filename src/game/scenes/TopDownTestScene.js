import Phaser from "/node_modules/.vite/deps/phaser.js?v=78944e93"
import { BOX_COLORS } from "/src/game/box.js"
import lives, { INVULNERABLE_MS } from "/src/game/lives.js"
import {
  TILE,
  DIRS,
  DOOR_KEYS,
  ROOMS,
  START_ROOM,
  neighborsOf,
  roomAt,
  validateGrid,
  entryPoint,
  doorRect,
  cellCenter,
  isWall,
  roomCols,
  roomRows,
  roomOrigin,
  roomW,
  roomH,
} from "../topDownRooms.js";
import { ARCHETYPES, stepEnemy, applyDamage } from "/src/game/enemyAI.js"
import {
  FONT,
  BTN,
  COLORS,
  addPaintBackground,
  addVignette,
  lipRect,
  makeButton,
  makeRibbon,
  drawPanel,
  keycap,
  makeHeart,
} from "/src/game/ui.js"

// ─────────────────────────────────────────────────────────────────
// PROTOTIPO top-down estilo Zelda/Isaac.
// Un mapa de habitaciones 3x3 conectadas por puertas en los muros.
// Al cruzar una puerta el jugador viaja a la habitacion vecina (la
// camara se desliza). Cada habitacion tiene una tarea:
//   empty   solo transito
//   combat  eliminar a todos los enemigos
//   boxes   empujar cada caja a su zona
//   mixed   ambas
// Si la tarea implica enemigos, las puertas se CIERRAN al entrar
// (room-lock tipo Isaac) y se abren al despejarla.
//
// Es una escena de prueba aislada: NO toca GameScene ni el juego real.
// ─────────────────────────────────────────────────────────────────

const PLAYER_SIZE = 32
const PLAYER_SPEED = 260
const BOX_SIZE = 40
const PUSH_SPEED = 130
const BOX_GAP = 6

const ATTACK_COOLDOWN_MS = 320
const ATTACK_ACTIVE_MS = 130
const ATTACK_REACH = 44
const ATTACK_SIZE = 44
const ATTACK_FILL = 0xfde68a
const ATTACK_STROKE = 0xf59e0b

const ENEMY_SIZE = 36
const PROJECTILE_RADIUS = 7
const ENEMY_HIT_GRACE_MS = 200
const ENEMY_HURT_MS = 120
const DEATH_FADE_MS = 180
const BLINK_MS = 80

const MAX_LIVES = 3

const WALL_FILL = 0x2b3b43
const WALL_STROKE = 0x0b1114
const WALL_TOP = 0x4d6673
const WALL_BASE = 0x1a262c
const PILLAR_FILL = 0x3a4d57
const PILLAR_STROKE = 0x8fb0c0
const FLOOR_A = 0x15222a
const FLOOR_B = 0x111c23
const FLOOR_FILL = FLOOR_A
const DOOR_CLOSED = 0xe5484d
const DOOR_OPEN = 0x4ade80

// Zona libre de obstaculos frente a cada puerta (en celdas): profundidad hacia
// adentro de la sala y celdas extra a cada lado del hueco.
const DOOR_CLEAR_DEPTH = 2
const DOOR_CLEAR_SIDE = 1

export default class TopDownTestScene extends Phaser.Scene {
  constructor() {
    super('TopDownTest')
  }

  init(data) {
    // La ayuda se muestra al entrar desde el menu, no al respawnear tras morir.
    this.skipHelp = data?.skipHelp === true
  }

  // Phaser reutiliza la MISMA instancia de la escena entre start/restart,
  // asi que todo lo que guardamos en `this` debe volver a cero aca.
  resetState() {
    this.walls = null
    this.roomColliders = []
    this.hint = null
    this.helpObjects = null
    this.helpKeyHandler = null
    this.helpOpen = false
    this.enemies = []
    this.ghosts = []
    this.boxes = []
    this.zones = []
    this.doors = []
    this.doorBlocks = []
    this.roomObjects = []
    this.room = null
    this.enterDir = null
    this.mapSpawn = null
    this.goalPad = null
    this.doorsLocked = false
    this.projectileGroup = null
    this.lifeDots = []
    this.roomLabel = null
    this.attackRect = null
    this.player = null
    this.roomPill = null
    this.roomTypeLabel = null
    this.hintBg = null
    this.leaving = false
    this.helpTweenTargets = null
    this.floorG = null
    this.deco = null
    this.grid = null
    this.carvedCache = {}
  }

  create() {
    // ── Reset de estado (la instancia se reutiliza entre restarts) ──
    this.resetState()

    this.chargerTrails = []
    this.detectionRadius = 200
    this.unstuckUntil = 0
    this.unstuckDir = new Phaser.Math.Vector2(1, 0)
    this.cameras.main.resetFX()
    this.cameras.main.setBackgroundColor(0x111318)
    this.cameras.main.fadeIn(400, 0, 0, 0)
    // Red de seguridad: si una transicion anterior dejo el mundo pausado,
    // al (re)crear la escena siempre arrancamos con fisica activa.
    this.physics.resume()
    this.gameOverTriggered = false
    this.currentTime = 0
    this.travelling = false
    this.clearedCount = 0
    // NO resetear vidas aca. Menu las resetea al entrar. Al morir se resta 1 y se reinicia sin resetear.

    // Limpieza al cerrar la escena (volver al menu, restart, etc).
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      if (this.cameras && this.cameras.main) this.cameras.main.resetFX()
      if (this.tweens) this.tweens.killAll()
      if (this.input && this.input.keyboard && this.helpKeyHandler) {
        this.input.keyboard.off('keydown', this.helpKeyHandler)
      }
      this.walls = null
      this.roomColliders = []
      this.hint = null
      this.helpObjects = null
      this.helpKeyHandler = null
      this.helpOpen = false
      this.projectileGroup = null
    })

    // Avisos de diseno (dev).
    const warns = validateGrid()
    warns.forEach((w) => console.warn('[TopDownTest] ' + w))

    this.physics.world.setBounds(0, 0, 840, 960)

    addPaintBackground(this, 840, 960)
    addVignette(this, 840, 960, 15)

    this.buildHud()

    // Contenedores de la habitacion actual.
    this.roomObjects = []

    // Estado por habitacion (persistente entre visitas).
    this.roomState = {}
    for (const room of ROOMS) {
      this.roomState[room.id] = { cleared: false }
    }

    this.player = this.add
      .rectangle(0, 0, PLAYER_SIZE, PLAYER_SIZE, 0x7dd3fc)
      .setStrokeStyle(3, 0x0369a1)
      .setDepth(10)
    this.physics.add.existing(this.player)
    this.player.body.setAllowGravity(false)
    this.player.body.setCollideWorldBounds(true)
    this.player.facing = new Phaser.Math.Vector2(1, 0)
    this.player.invulnerableUntil = 0

    this.attackRect = this.add
      .rectangle(0, 0, ATTACK_SIZE, ATTACK_SIZE, ATTACK_FILL, 0.3)
      .setStrokeStyle(2, ATTACK_STROKE)
      .setVisible(false)
      .setDepth(10)
    this.physics.add.existing(this.attackRect, true)
    this.attackRect.body.enable = false
    this.attackActiveUntil = 0
    this.attackCooldownUntil = 0

    // Proyectiles de los enemigos "shooter". El grupo persiste entre
    // habitaciones; sus hijos se limpian al viajar.
    this.projectileGroup = this.physics.add.group()

    this.cursors = this.input.keyboard.createCursorKeys()
    this.wasd = this.input.keyboard.addKeys({
      up: Phaser.Input.Keyboard.KeyCodes.W,
      down: Phaser.Input.Keyboard.KeyCodes.S,
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    })
    this.attackKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X)

    // Arranque: habitacion inicial, sin direccion de entrada.
    this.enterRoom(START_ROOM, null)

    this.hintBg = this.add.graphics().setScrollFactor(0).setDepth(20)
    this.hint = this.add
      .text(420, 922, '', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '15px',
        color: '#e5e7eb',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21)
    this.refreshHud()
    this.updateHint()

    if (!this.skipHelp) this.showHelpOverlay()
    else this.helpOpen = false
  }

  // ── Ayuda inicial ───────────────────────────────────────────────
  showHelpOverlay() {
    const { width, height } = this.scale
    this.helpOpen = true
    this.physics.pause()

    const dimmer = this.add
      .rectangle(width / 2, height / 2, width, height, 0x000000)
      .setAlpha(0)
      .setDepth(100)
      .setScrollFactor(0)
      .setInteractive()

    const W = 640
    const H = 720
    const panel = this.add.container(width / 2, height / 2).setDepth(101).setScrollFactor(0)
    panel.add(drawPanel(this, W, H))

    const title = makeRibbon(this, 'CÓMO JUGAR', 340, 28, 58)
    title.y = -H / 2
    panel.add(title)

    const left = -W / 2 + 44

    const header = (label, y) => {
      panel.add(
        this.add
          .text(left, y, label, {
            fontFamily: FONT,
            fontStyle: 'bold',
            fontSize: '16px',
            color: '#fbbf24',
          })
          .setOrigin(0, 0.5)
      )
      const g = this.add.graphics()
      g.lineStyle(2, COLORS.panelLine, 1)
      g.lineBetween(left + label.length * 10 + 14, y, W / 2 - 44, y)
      panel.add(g)
    }

    const row = (keys, action, y) => {
      const size = 38
      let kx = left
      keys.forEach((k) => {
        if (k === '/') {
          panel.add(
            this.add
              .text(kx + 10, y, '/', { fontFamily: FONT, fontSize: '22px', color: '#94a3b8' })
              .setOrigin(0.5)
          )
          kx += 24
          return
        }
        panel.add(keycap(this, kx + size / 2, y, k, size))
        kx += size + 6
      })
      panel.add(
        this.add
          .text(W / 2 - 44, y, action, {
            fontFamily: FONT,
            fontStyle: 'bold',
            fontSize: '17px',
            color: '#e5e7eb',
          })
          .setOrigin(1, 0.5)
      )
    }

    const bullet = (text, y) => {
      const g = this.add.graphics()
      g.fillStyle(COLORS.redLip, 1)
      g.fillCircle(left + 8, y + 2, 6)
      g.fillStyle(COLORS.red, 1)
      g.fillCircle(left + 8, y, 6)
      panel.add(g)
      panel.add(
        this.add
          .text(left + 28, y, text, {
            fontFamily: FONT,
            fontSize: '16px',
            color: '#e5e7eb',
          })
          .setOrigin(0, 0.5)
      )
    }

    header('CONTROLES', -290)
    row(['W', 'A', 'S', 'D', '/', '←', '↑', '↓', '→'], 'Mover', -240)
    row(['X'], 'Atacar', -192)
    row(['C'], 'Empujar cajas', -144)

    header('OBJETIVO', -84)
    bullet('Limpiá cada habitación para abrir las puertas.', -44)
    bullet('Eliminá enemigos y colocá las cajas en su zona.', -8)
    bullet('Las puertas se cierran hasta completar la tarea.', 28)

    header('TIPS', 84)
    bullet('Los enemigos tienen una zona de detección.', 124)
    bullet('Los cargadores avisan antes de embestir.', 160)
    bullet('Completá la sala GOAL para ganar.', 196)

    const go = makeButton(this, 0, 266, 280, 64, 'CONTINUAR', BTN.blue, 26, () => this.hideHelpOverlay())
    panel.add(go)

    const prompt = this.add
      .text(0, 330, 'PRESIONÁ ESPACIO O ENTER', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '14px',
        color: '#cbd5e1',
      })
      .setOrigin(0.5)
    panel.add(prompt)
    this.tweens.add({
      targets: prompt,
      alpha: 0.3,
      duration: 900,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    })

    panel.setScale(0.85).setAlpha(0)
    this.tweens.add({ targets: dimmer, alpha: 0.78, duration: 180 })
    this.tweens.add({ targets: panel, scale: 1, alpha: 1, duration: 280, ease: 'Back.easeOut' })

    this.helpObjects = [dimmer, panel]
    this.helpTweenTargets = [dimmer, panel, prompt, go]

    // Guardamos el HANDLER real (keyboard.on devuelve el plugin, no el handler).
    this.helpKeyHandler = (event) => {
      if (event.repeat) return
      if (event.code === 'Space' || event.code === 'Enter' || event.code === 'Escape') {
        this.hideHelpOverlay()
      }
    }
    this.input.keyboard.on('keydown', this.helpKeyHandler)
  }

  hideHelpOverlay() {
    if (!this.helpOpen) return
    this.helpOpen = false
    if (this.helpTweenTargets) {
      this.tweens.killTweensOf(this.helpTweenTargets)
      this.helpTweenTargets = null
    }
    if (this.helpObjects) {
      this.helpObjects.forEach((o) => o.destroy())
      this.helpObjects = null
    }
    if (this.helpKeyHandler) {
      this.input.keyboard.off('keydown', this.helpKeyHandler)
      this.helpKeyHandler = null
    }
    this.physics.resume()
    // Evita que el mismo Espacio/Enter active el ataque o quede como "down".
    this.input.keyboard.resetKeys()
  }

  // ── HUD ─────────────────────────────────────────────────────────
  buildHud() {
    // Barra superior oscura, anclada a la cámara.
    const bar = this.add.graphics().setScrollFactor(0).setDepth(19)
    bar.fillStyle(0x000000, 0.4)
    bar.fillRoundedRect(8, 14, 824, 62, 20)
    bar.fillStyle(COLORS.ink, 0.95)
    bar.fillRoundedRect(6, 4, 828, 64, 20)
    bar.fillStyle(COLORS.panel, 0.94)
    bar.fillRoundedRect(10, 8, 820, 56, 16)
    bar.lineStyle(2, COLORS.panelLine, 0.9)
    bar.strokeRoundedRect(14, 12, 812, 48, 12)

    const back = makeButton(this, 76, 34, 124, 40, 'MENÚ', BTN.orange, 16, () => this.goToMenu())
    back.setScrollFactor(0).setDepth(21)

    this.lifeDots = []
    for (let i = 0; i < MAX_LIVES; i++) {
      this.lifeDots.push(makeHeart(this, 168 + i * 34, 33, 24).setScrollFactor(0).setDepth(21))
    }

    this.roomPill = this.add.graphics().setScrollFactor(0).setDepth(20)
    this.roomLabel = this.add
      .text(420, 25, '', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '15px',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21)
    this.roomLabel.setShadow(0, 2, 'rgba(0,0,0,0.5)', 0, false, true)

    this.roomTypeLabel = this.add
      .text(420, 50, '', {
        fontFamily: FONT,
        fontStyle: 'bold',
        fontSize: '13px',
        color: '#fbbf24',
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(21)

    this.syncLives()
  }

  goToMenu() {
    if (this.leaving) return
    this.leaving = true
    this.physics.pause()
    this.cameras.main.fadeOut(220, 0, 0, 0)
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => {
      this.scene.start('Menu')
    })
  }

  refreshHud() {
    if (!this.roomLabel || !this.roomLabel.scene) return
    const room = this.room
    this.roomLabel.setText(`HABITACIÓN ${this.clearedCount}/${ROOMS.length}`)
    this.roomTypeLabel.setText(room ? this.typeName(room.type) : '')

    const w = this.roomLabel.width + 44
    const h = 28
    this.roomPill.clear()
    lipRect(this.roomPill, 420 - w / 2, 25 - h / 2, w, h, 12, COLORS.red, COLORS.redLip, 4)
  }

  typeName(type) {
    return (
      {
        empty: 'TRÁNSITO',
        combat: 'ELIMINAR ENEMIGOS',
        boxes: 'MOVER CAJAS',
        mixed: 'ENEMIGOS + CAJAS',
      }[type] || type.toUpperCase()
    )
  }

  syncLives() {
    if (!this.lifeDots) return
    for (let i = 0; i < this.lifeDots.length; i++) {
      const dot = this.lifeDots[i]
      if (dot && dot.scene) dot.setOn(i < lives.remaining)
    }
  }

  // ── construccion de habitacion ──────────────────────────────────
  enterRoom(room, enterDir) {
    // Limpiar colliders de la habitacion anterior (evita acumulacion).
    // Se protege contra colliders ya destruidos por el mundo de fisica.
    if (this.roomColliders) {
      this.roomColliders.forEach((c) => {
        if (c && c.world) c.destroy()
      })
    }
    this.roomColliders = []

    // Las paredes viejas se limpian por grupo (no van en roomObjects).
    if (this.walls && this.walls.scene) this.walls.clear(true, true)

    this.room = room
    this.grid = this.getGrid(room)
    this.enterDir = enterDir
    this.boxes = []
    this.zones = []
    this.enemies = []
    this.ghosts = []
    this.doors = []
    this.doorBlocks = []
    this.roomObjects = []
    this.mapSpawn = null
    this.goalPad = null

    // Piso: baldosas en damero + relieve de muros (se dibujan en buildFromMap).
    this.floorG = this.add.graphics().setDepth(-1)
    this.deco = this.add.graphics().setDepth(1)
    this.roomObjects.push(this.floorG, this.deco)

    this.walls = this.physics.add.staticGroup()

    this.buildFromMap(room)

    this.buildDoors(room)

    // Entidades.
    const point =
      entryPoint(room, enterDir) || this.mapSpawn || cellCenter(room, 1, 1)
    this.player.body.reset(point.x, point.y)
    this.player.setVisible(true)
    this.player.setAlpha(1)
    this.player.invulnerableUntil = this.currentTime + 900
    this.player.facing.set(1, 0)

    // Si la habitacion ya fue despejada antes, no se recrean enemigos:
    // queda abierta y sin combate (room-lock ya superado).
    const alreadyCleared = this.roomState[room.id].cleared
    if (room.enemies && !alreadyCleared) this.buildEnemies(room)

    // Colisiones.
    this.roomColliders.push(this.physics.add.collider(this.player, this.walls))
    this.roomColliders.push(this.physics.add.collider(this.boxes, this.walls))
    this.roomColliders.push(this.physics.add.collider(this.boxes, this.boxes))
    this.roomColliders.push(
      this.physics.add.collider(this.player, this.boxes, (pl, box) =>
        this.handlePush(pl, box)
      )
    )

    // Proyectiles enemigos: mueren contra las paredes y dañan al jugador.
    this.projectileGroup.clear(true, true)
    this.roomColliders.push(
      this.physics.add.collider(this.projectileGroup, this.walls, (proj) =>
        proj.destroy()
      )
    )
    this.roomColliders.push(
      this.physics.add.overlap(this.player, this.projectileGroup, (pl, proj) => {
        proj.destroy()
        this.createHitEffect(proj.x, proj.y, 0xc4b5fd)
        this.damagePlayer(proj)
      })
    )

    // Bloqueos de puerta (solidos solo cuando la sala esta bloqueada).
    this.doorBlocks.forEach(({ block }) => {
      this.roomColliders.push(this.physics.add.collider(this.player, block))
      this.roomColliders.push(this.physics.add.collider(this.boxes, block))
    })

    // Puertas: bloqueos solidos si la habitacion no esta despejada y
    // tiene combate; si no, abiertas.
    this.applyDoorLock()

    // Las habitaciones sin tarea (transito) cuentan como despejadas al
    // entrar: no requieren accion del jugador.
    if (room.type === 'empty' && !this.roomState[room.id].cleared) {
      this.roomState[room.id].cleared = true
      this.clearedCount++
    }

    this.refreshHud()
    this.updateHint()
  }

  // Direcciones con vecino existente.
  doorwaysOf(room) {
    return neighborsOf(room)
  }

  // Mapa efectivo de la habitacion: el original + una zona libre de paredes y
  // pilares frente a cada puerta que tenga vecino, y un pasillo que la conecta con
  // el resto de la sala si el diseno la dejaba aislada. Se calcula una vez por sala.
  getGrid(room) {
    if (this.carvedCache[room.id]) return this.carvedCache[room.id]

    const cols = roomCols(room)
    const rows = roomRows(room)
    const grid = []
    for (let r = 0; r < rows; r++) grid.push(Array.from(room.map[r]))

    const doorDirs = {}
    for (const { dir } of this.doorwaysOf(room)) doorDirs[dir] = true
    const keyToDir = {}
    for (const [dir, d] of Object.entries(DIRS)) keyToDir[d.key] = dir

    const inBounds = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows
    const interior = (c, r) => c >= 1 && r >= 1 && c <= cols - 2 && r <= rows - 2
    const solid = (ch) => isWall(ch) || ch === 'o'
    const walkable = (c, r) => {
      const ch = grid[r][c]
      if (DOOR_KEYS.has(ch)) return !!doorDirs[keyToDir[ch]]
      return !solid(ch)
    }
    const free = (c, r) => {
      if (inBounds(c, r) && interior(c, r) && solid(grid[r][c])) grid[r][c] = '.'
    }

    // 1) Zona libre frente a cada puerta activa.
    const anchors = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = grid[r][c]
        if (!DOOR_KEYS.has(ch) || !doorDirs[keyToDir[ch]]) continue

        let ix = 0
        let iy = 0
        if (r === 0) iy = 1
        else if (r === rows - 1) iy = -1
        else if (c === 0) ix = 1
        else if (c === cols - 1) ix = -1
        else continue

        const px = iy !== 0 ? 1 : 0
        const py = ix !== 0 ? 1 : 0
        for (let d = 1; d <= DOOR_CLEAR_DEPTH; d++) {
          for (let l = -DOOR_CLEAR_SIDE; l <= DOOR_CLEAR_SIDE; l++) {
            free(c + ix * d + px * l, r + iy * d + py * l)
          }
        }
        anchors.push({ c: c + ix * DOOR_CLEAR_DEPTH, r: r + iy * DOOR_CLEAR_DEPTH })
      }
    }

    // El punto de aparicion del mapa tambien tiene que ser alcanzable.
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (grid[r][c] === 'P') anchors.push({ c, r })
      }
    }

    // 2) Conectividad: todas las zonas de puerta (y el spawn) en una misma region.
    const flood = (sc, sr) => {
      const seen = new Set([sc + ',' + sr])
      const stack = [[sc, sr]]
      while (stack.length) {
        const [c, r] = stack.pop()
        for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = c + dc
          const nr = r + dr
          const k = nc + ',' + nr
          if (!inBounds(nc, nr) || seen.has(k) || !walkable(nc, nr)) continue
          seen.add(k)
          stack.push([nc, nr])
        }
      }
      return seen
    }

    if (anchors.length > 1) {
      for (let guard = 0; guard < 12; guard++) {
        const seen = flood(anchors[0].c, anchors[0].r)
        const lost = anchors.find((a) => !seen.has(a.c + ',' + a.r))
        if (!lost) break

        // Celda alcanzable mas cercana a la zona aislada.
        let best = null
        let bestDist = Infinity
        seen.forEach((k) => {
          const [c, r] = k.split(',').map(Number)
          const dist = Math.abs(c - lost.c) + Math.abs(r - lost.r)
          if (dist < bestDist) {
            bestDist = dist
            best = { c, r }
          }
        })
        if (!best) break

        // Pasillo en L (horizontal y despues vertical) hasta esa celda.
        let c = lost.c
        let r = lost.r
        while (c !== best.c) {
          free(c, r)
          c += Math.sign(best.c - c)
        }
        while (r !== best.r) {
          free(c, r)
          r += Math.sign(best.r - r)
        }
        free(c, r)
      }
    }

    this.carvedCache[room.id] = grid
    return grid
  }

  buildFromMap(room) {
    const doorDirs = {}
    for (const { dir } of this.doorwaysOf(room)) doorDirs[dir] = true

    const cols = roomCols(room)
    const rows = roomRows(room)

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const ch = this.grid[row][col]
        const { x, y } = cellCenter(room, col, row)

        // Letra de puerta: hueco solo si hay vecino en esa direccion.
        if (DOOR_KEYS.has(ch)) {
          const dir = Object.entries(DIRS).find(([, d]) => d.key === ch)[0]
          if (doorDirs[dir]) {
            // Piso transitable (hueco en el muro).
            this.drawFloorTile(x, y, col, row)
          } else {
            this.addWall(x, y)
          }
          continue
        }

        if (ch === '#') {
          this.addWall(x, y)
          continue
        }

        // Todo lo que no es muro apoya sobre una baldosa.
        this.drawFloorTile(x, y, col, row)

        if (ch === 'o') {
          this.addPillar(x, y)
          continue
        }

        if (ch === 'a' || ch === 'b') {
          this.boxes.push(this.buildBox(x, y, ch === 'a' ? 'yellow' : 'red'))
        } else if (ch === 'A' || ch === 'B') {
          const colorId = ch === 'A' ? 'yellow' : 'red'
          const rect = this.add
            .rectangle(x, y, 52, 52, BOX_COLORS[colorId].fill, 0.55)
            .setStrokeStyle(3, BOX_COLORS[colorId].stroke)
          this.zones.push({ rect, colorId })
          this.roomObjects.push(rect)
        } else if (ch === 'P') {
          this.mapSpawn = { x, y }
        } else if (ch === 'D') {
          // Pedestal de salida de la meta.
          const ped = this.add
            .rectangle(x, y, 56, 56, 0x4ade80, 0.35)
            .setStrokeStyle(3, 0x4ade80)
          this.goalPad = { x, y, rect: ped }
          this.roomObjects.push(ped)
        }
      }
    }
  }

  // Baldosa de piso en damero (todo lo que no es muro apoya sobre una).
  drawFloorTile(x, y, col, row) {
    const g = this.floorG
    if (!g) return
    g.fillStyle((col + row) % 2 === 0 ? FLOOR_A : FLOOR_B, 1)
    g.fillRect(x - TILE / 2, y - TILE / 2, TILE, TILE)
    g.lineStyle(1, 0x0b1114, 0.35)
    g.strokeRect(x - TILE / 2 + 0.5, y - TILE / 2 + 0.5, TILE - 1, TILE - 1)
  }

  // Muro: bloque rectangular con relieve (tapa clara arriba, base oscura abajo).
  addWall(x, y) {
    const wall = this.add
      .rectangle(x, y, TILE, TILE, WALL_FILL)
      .setStrokeStyle(2, WALL_STROKE)
    this.physics.add.existing(wall, true)
    this.walls.add(wall)

    const d = this.deco
    if (d) {
      d.fillStyle(WALL_TOP, 0.9)
      d.fillRect(x - TILE / 2 + 3, y - TILE / 2 + 3, TILE - 6, 5)
      d.fillStyle(WALL_BASE, 0.9)
      d.fillRect(x - TILE / 2 + 2, y + TILE / 2 - 8, TILE - 4, 6)
    }
    return wall
  }

  // Pilar: bloque suelto redondo (visual distinto del muro, misma fisica).
  addPillar(x, y) {
    const r = TILE * 0.38
    const pillar = this.add.circle(x, y, r, PILLAR_FILL).setStrokeStyle(3, PILLAR_STROKE)
    this.physics.add.existing(pillar, true)
    if (pillar.body) {
      pillar.body.setCircle(r, 0, 0)
      pillar.body.setOffset(-r, -r)
    }
    this.walls.add(pillar)
    this.roomObjects.push(pillar)
    return pillar
  }

  buildDoors(room) {
    for (const { dir } of this.doorwaysOf(room)) {
      const r = doorRect(room, dir)
      const frame = this.add
        .rectangle(r.x, r.y, r.w, r.h, DOOR_CLOSED)
        .setStrokeStyle(3, 0x0c0a09)
      // Zona-trigger de transito.
      const trigger = this.add.zone(r.x, r.y, r.w, r.h)
      trigger.setOrigin(0.5)
      this.physics.add.existing(trigger, true)

      this.doors.push({ dir, rect: frame, trigger })

      // Bloqueo fisico (se activa si la habitacion no esta despejada).
      const block = this.add
        .rectangle(r.x, r.y, r.w, r.h, DOOR_CLOSED, 0.001)
      this.physics.add.existing(block, true)
      block.body.enable = false
      this.doorBlocks.push({ dir, block })

      this.roomObjects.push(frame, trigger, block)
    }
  }

  buildBox(x, y, colorId) {
    const { fill, stroke } = BOX_COLORS[colorId]
    const box = this.add.rectangle(x, y, BOX_SIZE, BOX_SIZE, fill)
    box.setStrokeStyle(3, stroke)
    box.colorId = colorId
    this.physics.add.existing(box)
    box.body.setAllowGravity(false)
    box.body.setDrag(900, 900)
    box.body.setMaxVelocity(PUSH_SPEED, PUSH_SPEED)
    this.roomObjects.push(box)
    return box
  }

  buildEnemies(room) {
    const bodies = []
    const bossScale = room.isGoal ? 2 : 1

    for (const spec of room.enemies || []) {
      const base = ARCHETYPES[spec.type]
      if (!base) continue

      const { x, y } = cellCenter(room, spec.col, spec.row)
      const rect = this.spawnEnemyShape(spec.type, x, y)
      this.physics.add.existing(rect)
      rect.body.setAllowGravity(false)
      rect.body.setCollideWorldBounds(true)

      const patrol = this.patrolBoundsFor(room, spec.col, spec.row)
      const hp = base.hp * bossScale
      this.enemies.push({
        type: spec.type,
        rect,
        x,
        y,
        speed: base.speed,
        losRange: base.losRange,
        chargeSpeed: base.chargeSpeed,
        attackRateMs: base.attackRateMs,
        hp,
        maxHp: hp,
        dir: patrol.dir,
        from: patrol.from,
        state: 'patrol',
        stateUntil: 0,
        chargeDir: null,
        nextFireAt: 0,
        nextHitAt: 0,
        hurtUntil: 0,
        alive: true,
      })
      bodies.push(rect)
      this.roomObjects.push(rect)
    }

    if (bodies.length === 0) return

    this.roomColliders.push(
      this.physics.add.overlap(this.player, bodies, (pl, enemyRect) => {
        const enemy = this.enemies.find((e) => e.rect === enemyRect)
        this.damagePlayer(enemy)
      })
    )
    this.roomColliders.push(
      this.physics.add.overlap(this.attackRect, bodies, (a, b) =>
        this.hitEnemy(a, b)
      )
    )
  }

  // Dibuja un enemigo con una silueta distinta por arquetipo (se
  // identifica de un vistazo, como en Isaac). El cuerpo fisico sigue
  // siendo un AABB; la forma es solo visual.
  spawnEnemyShape(type, x, y) {
    const a = ARCHETYPES[type] || ARCHETYPES.pacer
    const s = ENEMY_SIZE
    if (type === 'chaser') {
      const c = this.add
        .circle(x, y, s / 2, a.fill)
        .setStrokeStyle(3, a.stroke)
      c.setOrigin(0.5)
      return c
    }
    if (type === 'charger') {
      const tri = this.add
        .triangle(x, y, -s / 2, -s / 2, -s / 2, s / 2, s / 2, 0, a.fill)
        .setStrokeStyle(3, a.stroke)
      tri.setOrigin(0.5)
      return tri
    }
    if (type === 'shooter') {
      const star = this.add
        .star(x, y, 4, s * 0.22, s / 2, a.fill)
        .setStrokeStyle(3, a.stroke)
      star.setOrigin(0.5)
      return star
    }
    const rect = this.add.rectangle(x, y, s, s, a.fill).setStrokeStyle(3, a.stroke)
    rect.setOrigin(0.5)
    return rect
  }

  // Corrida transitable mas larga que pasa por la celda de spawn; se
  // usa como rango de patrulla cuando el enemigo no persigue/embiste.
  patrolBoundsFor(room, col, row) {
    const cols = roomCols(room)
    const rows = roomRows(room)
    const walkable = (c, r) =>
      c >= 0 && r >= 0 && c < cols && r < rows && !isWall(this.grid[r][c])

    let left = col
    let right = col
    while (walkable(left - 1, row)) left--
    while (walkable(right + 1, row)) right++

    let up = row
    let down = row
    while (walkable(col, up - 1)) up--
    while (walkable(col, down + 1)) down++

    const hLen = right - left
    const vLen = down - up
    if (hLen >= 3 && hLen >= vLen) {
      const a = cellCenter(room, left, row)
      const b = cellCenter(room, right, row)
      return {
        from: { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
        dir: { x: 1, y: 0 },
      }
    }
    if (vLen >= 3) {
      const a = cellCenter(room, col, up)
      const b = cellCenter(room, col, down)
      return {
        from: { x1: a.x, y1: a.y, x2: b.x, y2: b.y },
        dir: { x: 0, y: 1 },
      }
    }
    const c = cellCenter(room, col, row)
    return { from: { x1: c.x, y1: c.y, x2: c.x, y2: c.y }, dir: { x: 0, y: 0 } }
  }

  // ── estado de la tarea ──────────────────────────────────────────
  hasCombat(room) {
    return room.type === 'combat' || room.type === 'mixed'
  }

  hasBoxes(room) {
    return room.type === 'boxes' || room.type === 'mixed'
  }

  enemiesAlive() {
    return this.enemies.filter((e) => e.alive).length
  }

  boxesPlaced() {
    if (this.zones.length === 0) return true
    return this.zones.every((zone) =>
      this.boxes.some(
        (box) =>
          box.colorId === zone.colorId &&
          Phaser.Geom.Rectangle.Overlaps(box.getBounds(), zone.rect.getBounds())
      )
    )
  }

  clearConditionMet() {
    const room = this.room
    // Si ya fue despejada en una visita previa, sigue despejada.
    if (this.roomState[room.id] && this.roomState[room.id].cleared) return true
    const combatOk = !this.hasCombat(room) || this.enemiesAlive() === 0
    const boxesOk = !this.hasBoxes(room) || this.boxesPlaced()
    return combatOk && boxesOk
  }

  // Cierra o abre las puertas segun el estado. Estilo Isaac: mientras
  // haya tarea pendiente (enemigos y/o cajas), las puertas bloquean; al
  // despejar la habitacion se abren. Las de transito nunca bloquean.
  applyDoorLock() {
    const hasTask = this.hasCombat(this.room) || this.hasBoxes(this.room)
    const locked = hasTask && !this.clearConditionMet()
    for (const { rect } of this.doors) {
      rect.setFillStyle(locked ? DOOR_CLOSED : DOOR_OPEN)
    }
    for (const { block } of this.doorBlocks) {
      block.body.enable = locked
    }
    this.doorsLocked = locked
  }

  onRoomCleared() {
    const st = this.roomState[this.room.id]
    if (!st.cleared) {
      st.cleared = true
      this.clearedCount++
    }
    this.applyDoorLock()
    this.refreshHud()
    this.updateHint()

    if (this.room.isGoal) {
      const dim = this.add.rectangle(420, 480, 840, 960, 0x000000).setAlpha(0).setScrollFactor(0).setDepth(58)
      this.tweens.add({ targets: dim, alpha: 0.6, duration: 400 })
      const banner = makeRibbon(this, '¡MAPA COMPLETO!', 560, 40, 84, BTN.blue)
      banner.setPosition(420, 480).setScrollFactor(0).setDepth(60).setAlpha(0).setScale(0.6)
      this.tweens.add({ targets: banner, alpha: 1, scale: 1, duration: 450, ease: 'Back.easeOut' })
      this.time.delayedCall(1200, () => this.scene.start('Victory'))
    }
  }

  updateHint() {
    if (!this.hint || !this.hint.scene) return
    const room = this.room
    let msg = ''
    let color = '#e5e7eb'
    if (this.roomState[room.id].cleared) {
      msg = 'Habitación despejada. Buscá una puerta verde.'
      color = '#86efac'
    } else if (room.type === 'combat') {
      msg = 'Eliminá a todos los centinelas (X) para abrir las puertas.'
    } else if (room.type === 'boxes') {
      msg = 'Empujá cada caja a su zona para abrir las puertas.'
    } else if (room.type === 'mixed') {
      msg = 'Eliminá a los centinelas y ubicá las cajas en sus zonas.'
    } else {
      msg = 'Cruzá una puerta para viajar a la habitación vecina.'
    }
    this.hint.setText(msg).setColor(color)
    this.redrawHintBg()
  }

  // Cápsula oscura con labio detrás del texto de ayuda.
  redrawHintBg() {
    if (!this.hintBg || !this.hintBg.scene || !this.hint) return
    const w = this.hint.width + 56
    const h = 38
    const x = this.hint.x - w / 2
    const y = this.hint.y - h / 2 - 2
    const g = this.hintBg
    g.clear()
    g.fillStyle(0x000000, 0.4)
    g.fillRoundedRect(x, y + 10, w, h, 14)
    lipRect(g, x, y, w, h, 14, COLORS.panel, COLORS.ink, 5)
    g.lineStyle(2, COLORS.panelLine, 0.9)
    g.strokeRoundedRect(x + 1, y + 1, w - 2, h - 2, 13)
  }

  // ── viaje entre habitaciones ────────────────────────────────────
  travel(dir) {
    if (this.travelling || this.gameOverTriggered) return
    if (this.doorsLocked) return // room-lock: puertas cerradas

    const d = DIRS[dir]
    const next = roomAt(this.room.col + d.dc, this.room.row + d.dr)
    if (!next) return

    this.travelling = true
    this.physics.pause()

    const oldObjs = this.roomObjects
    const oldPlayer = this.player

    // La habitacion vieja se desvanece y se destruye; luego se construye
    // la nueva y el jugador aparece en el borde opuesto a la entrada.
    // Las paredes viejas las limpia enterRoom via walls.clear().
    this.cameras.main.fadeOut(180, 0, 0, 0)
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        for (const o of oldObjs) if (o && o.destroy) o.destroy()
        this.roomObjects = []

        oldPlayer.setVisible(false)
        this.enterRoom(next, dir)

        this.cameras.main.fadeIn(180, 0, 0, 0)
        this.cameras.main.once(
          Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
          () => {
            this.physics.resume()
            this.travelling = false
          }
        )
      }
    )
  }

  // ── combate / daño ──────────────────────────────────────────────
  handlePush(player, box) {
    const vx = player.body.velocity.x
    const vy = player.body.velocity.y

    let dirX = 0
    let dirY = 0
    if (Math.abs(vx) >= Math.abs(vy)) dirX = Math.sign(vx)
    else dirY = Math.sign(vy)

    if (box.body.blocked.left && dirX < 0) return
    if (box.body.blocked.right && dirX > 0) return
    if (box.body.blocked.up && dirY < 0) return
    if (box.body.blocked.down && dirY > 0) return

    if (this.boxWouldCollide(box, dirX, dirY)) return

    if (dirX !== 0) {
      box.body.setVelocityX(dirX * PUSH_SPEED)
      box.body.setVelocityY(0)
    } else {
      box.body.setVelocityY(dirY * PUSH_SPEED)
      box.body.setVelocityX(0)
    }
  }

  boxWouldCollide(box, dirX, dirY) {
    const probe = BOX_GAP
    const nx = box.x + dirX * probe
    const ny = box.y + dirY * probe
    for (const other of this.boxes) {
      if (other === box) continue
      const dx = Math.abs(nx - other.x)
      const dy = Math.abs(ny - other.y)
      if (dx < BOX_SIZE + BOX_GAP && dy < BOX_SIZE + BOX_GAP) return true
    }
    return false
  }

  hitEnemy(a, b) {
    const enemy = this.enemies.find((e) => e.rect === a || e.rect === b)
    if (!enemy || !enemy.alive) return
    if (this.currentTime < (enemy.nextHitAt || 0)) return
    enemy.nextHitAt = this.currentTime + ENEMY_HIT_GRACE_MS

    // Efecto visual de golpe
    this.createHitEffect(enemy.rect.x, enemy.rect.y, 0xfde68a)
    if (this.cameras && this.cameras.main) {
      this.cameras.main.shake(80, 0.002)
    }

    // Knockback al enemigo
    if (this.player && this.player.body && enemy.rect && enemy.rect.body) {
      const dx = enemy.rect.x - this.player.x
      const dy = enemy.rect.y - this.player.y
      const len = Math.hypot(dx, dy) || 1
      enemy.knockbackUntil = this.currentTime + 120
      enemy.knockbackVelX = (dx / len) * 160
      enemy.knockbackVelY = (dy / len) * 160
    }

    const res = applyDamage(enemy.hp, 1)
    enemy.hp = res.hp
    enemy.hurtUntil = this.currentTime + ENEMY_HURT_MS

    if (!res.dead) {
      if (enemy.rect && enemy.rect.setTint) enemy.rect.setTint(0xffffff)
      this.tweens.add({
        targets: enemy.rect,
        alpha: 0.25,
        duration: 60,
        yoyo: true,
        repeat: 1,
        onComplete: () => {
          if (enemy.rect && enemy.rect.scene && enemy.alive) {
            enemy.rect.setAlpha(1)
            if (enemy.rect.clearTint) enemy.rect.clearTint()
          }
        },
      })
      return
    }

    enemy.alive = false
    if (enemy.rect.body) enemy.rect.body.enable = false

    const { x, y } = enemy.rect
    const base = ARCHETYPES[enemy.type] || ARCHETYPES.pacer
    const ghost = this.add
      .rectangle(x, y, ENEMY_SIZE, ENEMY_SIZE, base.fill, 0.55)
      .setStrokeStyle(2, base.stroke)
    this.ghosts.push({ rect: ghost, born: this.currentTime })
    if (this.cameras && this.cameras.main) {
      this.cameras.main.shake(100, 0.003)
    }
    enemy.rect.destroy()

    if (this.clearConditionMet()) this.onRoomCleared()
  }

  // Compatibilidad con eventos antiguos.
  kill(a, b) {
    this.hitEnemy(a, b)
  }

  fireProjectile(enemy) {
    const a = ARCHETYPES.shooter
    const rect = enemy.rect
    if (!rect || !this.projectileGroup || !this.player) return
    const dx = this.player.x - rect.x
    const dy = this.player.y - rect.y
    const angle = Math.atan2(dy, dx)
    // Rotar el disparador hacia el jugador SIEMPRE
    if (rect.setAngle) {
      rect.setAngle(Phaser.Math.RadToDeg(angle))
    }
    const spawnDist = (rect.width || ENEMY_SIZE) / 2 + PROJECTILE_RADIUS + 4
    const ball = this.add
      .circle(rect.x + Math.cos(angle) * spawnDist, rect.y + Math.sin(angle) * spawnDist, PROJECTILE_RADIUS, a.projectileFill)
      .setStrokeStyle(2, a.stroke)
    this.physics.add.existing(ball)
    ball.body.setAllowGravity(false)
    ball.body.setVelocity(Math.cos(angle) * a.projectileSpeed, Math.sin(angle) * a.projectileSpeed)
    this.projectileGroup.add(ball)
  }

  createHitEffect(x, y, color = 0xffffff) {
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI * 2 * i) / 6
      const p = this.add.circle(x, y, 3, color)
      this.physics.add.existing(p)
      p.body.setAllowGravity(false)
      p.body.setVelocity(Math.cos(angle) * 80, Math.sin(angle) * 80)
      this.tweens.add({
        targets: p,
        alpha: 0,
        scale: 0.3,
        duration: 200,
        onComplete: () => p.destroy(),
      })
      this.time.delayedCall(200, () => {
        if (p && p.body) p.body.setVelocity(0, 0)
      })
    }
  }

  // Colisiones con muros: acepta gameobject o body segun el callback.
  isBlockedWorld(x, y) {
    const room = this.room
    if (!room || !this.grid) return true
    const o = roomOrigin(room)
    const cols = roomCols(room)
    const rows = roomRows(room)
    const col = Math.floor((x - o.x) / TILE)
    const row = Math.floor((y - o.y) / TILE)
    if (col < 0 || row < 0 || col >= cols || row >= rows) return true
    return isWall(this.grid[row][col])
  }

  damagePlayer(source) {
    if (this.gameOverTriggered || this.travelling) return
    if (this.currentTime < this.player.invulnerableUntil) return

    // Efectos visuales de daño
    if (this.cameras && this.cameras.main) {
      this.cameras.main.flash(150, 255, 40, 40, false)
      this.cameras.main.shake(150, 0.004)
    }
    if (this.player && this.player.setTint) this.player.setTint(0xff6666)
    this.time.delayedCall(100, () => {
      if (this.player && this.player.scene && this.player.clearTint) this.player.clearTint()
    })

    // Knockback al jugador
    if (this.player && this.player.body) {
      let dx = 0
      let dy = 0
      if (source && source.x !== undefined && source.y !== undefined) {
        dx = this.player.x - source.x
        dy = this.player.y - source.y
      } else if (source && source.rect) {
        dx = this.player.x - source.rect.x
        dy = this.player.y - source.rect.y
      }
      const len = Math.hypot(dx, dy) || 1
      this.player.knockbackUntil = this.currentTime + 100
      this.player.knockbackVelX = (dx / len) * 140
      this.player.knockbackVelY = (dy / len) * 140
    }

    if (lives.lose() <= 0) {
      this.player.invulnerableUntil = Number.MAX_SAFE_INTEGER
      this.syncLives()
      this.die()
      return
    }

    this.player.invulnerableUntil = this.currentTime + INVULNERABLE_MS
    this.syncLives()
  }

  die() {
    if (this.gameOverTriggered) return
    this.gameOverTriggered = true

    this.physics.pause()
    this.player.setVisible(false)
    this.cameras.main.fadeOut(500, 0, 0, 0)
    this.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        // Si queda vidas, reiniciar desde inicio SIN resetear vidas (ya se resto 1)
        if (lives.remaining > 0) {
          this.scene.restart({ skipHelp: true })
          return
        }
        // Sin vidas -> ir a GameOver con info del prototipo
        this.scene.start('GameOver', { level: 'TopDownTest', floor: 1 })
      }
    )
  }

  // ── update ──────────────────────────────────────────────────────
  applyEnemyVisual(enemy, time) {
    const a = ARCHETYPES[enemy.type] || ARCHETYPES.pacer
    if (enemy.type === 'charger') {
      if (enemy.state === 'windup') {
        const on = Math.floor(time / 90) % 2 === 0
        enemy.rect.setFillStyle(on ? 0xffffff : a.fill)
        enemy.rect.setAngle(0)
      } else if (enemy.state === 'charge') {
        enemy.rect.setFillStyle(a.chargeFill || 0xfef08a)
        if (enemy.chargeDir) {
          enemy.rect.setAngle(
            Phaser.Math.RadToDeg(Math.atan2(enemy.chargeDir.y, enemy.chargeDir.x))
          )
        }
      } else {
        enemy.rect.setFillStyle(a.fill)
        enemy.rect.setAngle(0)
      }
    } else if (enemy.type === 'shooter' && this.player) {
      // Apuntar hacia el jugador
      const dx = this.player.x - enemy.rect.x
      const dy = this.player.y - enemy.rect.y
      enemy.rect.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)))
    } else if (enemy.type === 'chaser' && this.player) {
      const dx = this.player.x - enemy.rect.x
      const dy = this.player.y - enemy.rect.y
      if (enemy.state === 'chase') {
        enemy.rect.setAngle(Phaser.Math.RadToDeg(Math.atan2(dy, dx)))
      } else {
        enemy.rect.setAngle(0)
      }
    } else if (enemy.type === 'pacer') {
      enemy.rect.setAngle(0)
    }
    if (enemy.hurtUntil && time < enemy.hurtUntil) {
      enemy.rect.setAlpha(0.35)
    } else if (enemy.rect.alpha !== 1) {
      enemy.rect.setAlpha(1)
    }
  }

  clampEnemyToRoom(enemy) {
    const room = this.room
    if (!room || !enemy.rect) return
    const o = roomOrigin(room)
    const minX = o.x + TILE * 0.5
    const maxX = o.x + roomW(room) - TILE * 0.5
    const minY = o.y + TILE * 0.5
    const maxY = o.y + roomH(room) - TILE * 0.5
    if (enemy.rect.x < minX) enemy.rect.x = minX
    if (enemy.rect.x > maxX) enemy.rect.x = maxX
    if (enemy.rect.y < minY) enemy.rect.y = minY
    if (enemy.rect.y > maxY) enemy.rect.y = maxY
  }

  addChargerTrail(enemy) {
    if (!this.chargerTrails) this.chargerTrails = []
    if (!enemy.rect) return
    const rect = this.add.rectangle(enemy.rect.x, enemy.rect.y, ENEMY_SIZE, ENEMY_SIZE, 0xfbbf24, 0.4)
    rect.setStrokeStyle(2, 0xf59e0b)
    this.chargerTrails.push({ rect, life: 160 })
  }

  updateEnemies(time) {
    for (const enemy of this.enemies) {
      if (!enemy.alive) continue
      if (!enemy.rect || !enemy.rect.body) continue

      enemy.x = enemy.rect.x
      enemy.y = enemy.rect.y

      // Detección: fuera de radio -> forzar a patrullar (evitar que persiga desde lejos)
      if (this.player) {
        const distDet = Phaser.Math.Distance.Between(enemy.rect.x, enemy.rect.y, this.player.x, this.player.y)
        if (distDet > this.detectionRadius) {
          // si estaba persiguiendo/cargando, bajarle velocidad o empujarlo a patrol
          if (enemy.state === 'chase' || enemy.state === 'charge' || enemy.state === 'windup') {
            enemy.state = 'patrol'
            enemy.stateUntil = time + 400
          }
        }
      }

      // Aplicar knockback si está activo
      if (enemy.knockbackUntil && time < enemy.knockbackUntil) {
        enemy.rect.body.setVelocity(enemy.knockbackVelX || 0, enemy.knockbackVelY || 0)
        // Permitir que los shooters disparen durante knockback
        if (enemy.type === 'shooter') {
          const outKb = stepEnemy(enemy, {
            now: time,
            px: this.player ? this.player.x : enemy.x,
            py: this.player ? this.player.y : enemy.y,
            isBlockedAt: (x, y) => this.isBlockedWorld(x, y),
          })
          if (outKb.nextFireAt !== undefined) enemy.nextFireAt = outKb.nextFireAt
          if (outKb.fire) this.fireProjectile(enemy)
        }
        this.applyEnemyVisual(enemy, time)
        this.clampEnemyToRoom(enemy)
        // Trail pa' charger cargando
        if (enemy.type === 'charger' && enemy.state === 'charge') this.addChargerTrail(enemy)
        continue
      }

      const out = stepEnemy(enemy, {
        now: time,
        px: this.player ? this.player.x : enemy.x,
        py: this.player ? this.player.y : enemy.y,
        isBlockedAt: (x, y) => this.isBlockedWorld(x, y),
      })

      if (out.dir) enemy.dir = out.dir
      if (out.state !== undefined) enemy.state = out.state
      if (out.stateUntil !== undefined) enemy.stateUntil = out.stateUntil
      if (out.chargeDir !== undefined) enemy.chargeDir = out.chargeDir
      if (out.nextFireAt !== undefined) enemy.nextFireAt = out.nextFireAt

      if (enemy.type === 'charger' && enemy.state === 'charge') this.addChargerTrail(enemy)

      enemy.rect.body.setVelocity(out.vx || 0, out.vy || 0)
      if (out.fire) this.fireProjectile(enemy)
      this.applyEnemyVisual(enemy, time)
      this.clampEnemyToRoom(enemy)
    }

    if (this.projectileGroup) {
      this.projectileGroup.getChildren().forEach((p) => {
        if (!p || !p.active) return
        if (p.x < -80 || p.x > 920 || p.y < -80 || p.y > 1040) {
          p.destroy()
        }
      })
    }

    // Anti-atasco
    for (const enemy of this.enemies) {
      if (!enemy.alive || !enemy.rect || !enemy.rect.body) continue
      const body = enemy.rect.body
      const vx = Math.abs(body.velocity.x)
      const vy = Math.abs(body.velocity.y)
      const moving = vx + vy > 10
      if (!moving) {
        if (!enemy.stuckSince) enemy.stuckSince = time
      } else {
        enemy.stuckSince = time
      }
      if (enemy.stuckSince && time - enemy.stuckSince > 280) {
        if (!enemy.unstuckUntil || time >= enemy.unstuckUntil) {
          enemy.unstuckUntil = time + 220
          const dirs = [
            { x: 1, y: 0 },
            { x: -1, y: 0 },
            { x: 0, y: 1 },
            { x: 0, y: -1 },
          ]
          const d = dirs[Phaser.Math.Between(0, dirs.length - 1)]
          body.setVelocity(d.x * 90, d.y * 90)
          enemy.stuckSince = time
        }
      }
    }

    if (this.chargerTrails) {
      for (let i = this.chargerTrails.length - 1; i >= 0; i--) {
        const t = this.chargerTrails[i]
        t.life -= 16
        if (t.life <= 0) {
          if (t.rect && t.rect.destroy) t.rect.destroy()
          this.chargerTrails.splice(i, 1)
          continue
        }
        if (t.rect) {
          t.rect.setAlpha(Math.max(0, t.life / 160) * 0.35)
        }
      }
    }

    for (let i = this.ghosts.length - 1; i >= 0; i--) {
      const ghost = this.ghosts[i]
      const t = (time - ghost.born) / DEATH_FADE_MS
      if (t >= 1) {
        ghost.rect.destroy()
        this.ghosts.splice(i, 1)
        continue
      }
      ghost.rect.setAlpha(0.55 * (1 - t))
      ghost.rect.setScale(1 + 0.6 * t)
    }
  }

  updateAttack(time) {
    if (
      Phaser.Input.Keyboard.JustDown(this.attackKey) &&
      time >= this.attackCooldownUntil &&
      !this.gameOverTriggered &&
      !this.travelling
    ) {
      this.attackCooldownUntil = time + ATTACK_COOLDOWN_MS
      this.attackActiveUntil = time + ATTACK_ACTIVE_MS
    }

    const active = time < this.attackActiveUntil
    this.attackRect.body.enable = active
    this.attackRect.setVisible(active)

    if (active) {
      this.attackRect.body.reset(
        this.player.x + this.player.facing.x * ATTACK_REACH,
        this.player.y + this.player.facing.y * ATTACK_REACH
      )
    }
  }

  updateInvulnerability(time) {
    if (time < this.player.invulnerableUntil) {
      this.player.setAlpha(Math.floor(time / BLINK_MS) % 2 === 0 ? 0.3 : 1)
    } else if (this.player.alpha !== 1) {
      this.player.setAlpha(1)
    }
  }

  checkDoors() {
    if (this.doorsLocked || this.travelling) return
    const pb = this.player.getBounds()
    for (const { dir, trigger } of this.doors) {
      if (Phaser.Geom.Rectangle.Overlaps(pb, trigger.getBounds())) {
        this.travel(dir)
        return
      }
    }
  }

  updateZoneFeedback() {
    for (const zone of this.zones) {
      const filled = this.boxes.some(
        (box) =>
          box.colorId === zone.colorId &&
          Phaser.Geom.Rectangle.Overlaps(box.getBounds(), zone.rect.getBounds())
      )
      zone.rect.setStrokeStyle(
        filled ? 4 : 3,
        filled ? 0x4ade80 : BOX_COLORS[zone.colorId].stroke
      )
    }
  }

  update(time) {
    if (!this.player || !this.player.body) return
    this.currentTime = time

    if (this.helpOpen) return
    if (this.travelling) return
    if (this.leaving) return

    const left = this.cursors.left.isDown || this.wasd.left.isDown
    const right = this.cursors.right.isDown || this.wasd.right.isDown
    const up = this.cursors.up.isDown || this.wasd.up.isDown
    const down = this.cursors.down.isDown || this.wasd.down.isDown

    if (!this.gameOverTriggered) {
      // Aplicar knockback al jugador si está activo
      if (this.player.knockbackUntil && time < this.player.knockbackUntil) {
        this.player.body.setVelocity(this.player.knockbackVelX || 0, this.player.knockbackVelY || 0)
      } else {
        const dir = new Phaser.Math.Vector2(
          (right ? 1 : 0) - (left ? 1 : 0),
          (down ? 1 : 0) - (up ? 1 : 0)
        )

        if (dir.lengthSq() > 0) {
          dir.normalize()
          this.player.body.setVelocity(dir.x * PLAYER_SPEED, dir.y * PLAYER_SPEED)
          this.player.facing.copy(dir)
        } else {
          this.player.body.setVelocity(0, 0)
        }
      }

      this.updateAttack(time)
      this.updateEnemies(time)
      this.updateInvulnerability(time)
      this.updateZoneFeedback()

      // Si la tarea se cumple (cajas en su lugar y, si hay, enemigos
      // eliminados), se despeja la habitacion y se abren las puertas.
      if (
        this.hasBoxes(this.room) &&
        !this.roomState[this.room.id].cleared &&
        this.clearConditionMet()
      ) {
        this.onRoomCleared()
      }

      this.checkDoors()
    }
  }
}