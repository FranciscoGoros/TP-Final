import { ENEMY_TYPES } from './enemyAI.js'

// ─────────────────────────────────────────────────────────────────
// Datos del mapa de habitaciones del PROTOTIPO top-down estilo Zelda/Isaac:
// una grilla logica 3x3 donde cada celda es una habitacion. Las puertas
// se detectan dinámicamente según los símbolos en la matriz del mapa.
// ─────────────────────────────────────────────────────────────────

export const TILE = 64
export const DEFAULT_COLS = 12
export const DEFAULT_ROWS = 11

export const GRID_COLS = 3
export const GRID_ROWS = 3

// Direccion de cada puerta: nombre -> vector de grilla + tecla de mapa.
export const DIRS = {
  N: { dc: 0, dr: -1, dx: 0, dy: -1, key: '^' },
  S: { dc: 0, dr: 1, dx: 0, dy: 1, key: 'v' },
  W: { dc: -1, dr: 0, dx: -1, dy: 0, key: '<' },
  E: { dc: 1, dr: 0, dx: 1, dy: 0, key: '>' },
}

export const DOOR_KEYS = new Set(Object.values(DIRS).map((d) => d.key))

// ── helpers por-habitacion ────────────────────────────────────────
export function roomCols(room) {
  return room.cols || DEFAULT_COLS
}

export function roomRows(room) {
  return room.rows || DEFAULT_ROWS
}

export function roomW(room) {
  return roomCols(room) * TILE
}

export function roomH(room) {
  return roomRows(room) * TILE
}

// Origen de la grilla de tiles dentro de la sala de 840x960.
export function roomOrigin(room) {
  return {
    x: (840 - roomW(room)) / 2,
    y: (960 - roomH(room)) / 2,
  }
}

export function cellCenter(room, col, row) {
  const o = roomOrigin(room)
  return {
    x: o.x + col * TILE + TILE / 2,
    y: o.y + row * TILE + TILE / 2,
  }
}

// Columna/fila central por defecto (fallback)
export function doorCol(room) {
  return Math.floor(roomCols(room) / 2)
}

export function doorRow(room) {
  return Math.floor(roomRows(room) / 2)
}

// 🔍 Detección dinámica: busca la posición exacta del símbolo de la puerta en el mapa
export function findDoorPosition(room, dir) {
  const targetKey = DIRS[dir].key
  if (room.map) {
    for (let r = 0; r < room.map.length; r++) {
      for (let c = 0; c < room.map[r].length; c++) {
        if (room.map[r][c] === targetKey) {
          return { col: c, row: r }
        }
      }
    }
  }
  // Fallback al centro matemático si no se encuentra explícitamente en el mapa
  switch (dir) {
    case 'N': return { col: doorCol(room), row: 0 }
    case 'S': return { col: doorCol(room), row: roomRows(room) - 1 }
    case 'W': return { col: 0, row: doorRow(room) }
    case 'E': return { col: roomCols(room) - 1, row: doorRow(room) }
  }
  return { col: doorCol(room), row: doorRow(room) }
}

// Centro de la puerta según dirección y posición real en el mapa, en píxeles.
export function doorCenter(room, dir) {
  const o = roomOrigin(room)
  const pos = findDoorPosition(room, dir)
  const cellX = o.x + pos.col * TILE + TILE / 2
  const cellY = o.y + pos.row * TILE + TILE / 2

  switch (dir) {
    case 'N':
      return { x: cellX, y: o.y }
    case 'S':
      return { x: cellX, y: o.y + roomH(room) }
    case 'W':
      return { x: o.x, y: cellY }
    case 'E':
      return { x: o.x + roomW(room), y: cellY }
  }
}

// Punto de aparicion del jugador al ENTRAR desde `enterDir`.
export function entryPoint(room, enterDir) {
  if (!enterDir) return null
  const from = opposite(enterDir)
  const c = doorCenter(room, from)
  const inset = TILE * 1.6
  switch (from) {
    case 'N':
      return { x: c.x, y: c.y + inset }
    case 'S':
      return { x: c.x, y: c.y - inset }
    case 'W':
      return { x: c.x + inset, y: c.y }
    case 'E':
      return { x: c.x - inset, y: c.y }
  }
}

// Rectangulo del trigger de puerta en el muro.
export function doorRect(room, dir) {
  const c = doorCenter(room, dir)
  const span = TILE * 1.4
  const t = 22
  if (dir === 'N' || dir === 'S') return { x: c.x, y: c.y, w: span, h: t }
  return { x: c.x, y: c.y, w: t, h: span }
}

// Las puertas NUNCA deben considerarse muros
export function isWall(ch) {
  if (DOOR_KEYS.has(ch)) return false
  return ch === '#' || ch === 'o'
}

// Utilidad para que el renderizador trate el símbolo de puerta como piso '.'
export function getTile(room, col, row) {
  const ch = room.map[row]?.[col]
  if (DOOR_KEYS.has(ch)) return '.'
  return ch || '#'
}

// ── plantillas por arquetipo ──────────────────────────────────────
const MAP_START = [
  '#####^######',
  '#.P........#',
  '#..........#',
  '#..o....o..#',
  '#..........#',
  '<..........>',
  '#..........#',
  '#..o....o..#',
  '#..........#',
  '#..........#',
  '#####v######',
]

const MAP_C1 = [
  '#####^######',
  '#..........#',
  '#..o....o..#',
  '#..........#',
  '#..........#',
  '<..........>',
  '#..........#',
  '#..........#',
  '#..o....o..#',
  '#..........#',
  '#####v######',
]

const MAP_C2 = [
  '#####^######',
  '#.o.o..o.o.#',
  '#..........#',
  '#..o.oo.o..#',
  '#..........#',
  '<..........>',
  '#..........#',
  '#..o.oo.o..#',
  '#..........#',
  '#.o.o..o.o.#',
  '#####v######',
]

const MAP_B1 = [
  '#####^######',
  '#.P........#',
  '#.##....##.#',
  '#..........#',
  '#....##....#',
  '<...a..b...>',
  '#....##....#',
  '#..........#',
  '#.##....##.#',
  '#....A.B...#',
  '#####v######',
]

const MAP_M1 = [
  '######^#####',
  '#..........#',
  '#..o....o..#',
  '#..##..##..#',
  '#..........#',
  '<...a..b...>',
  '#..........#',
  '#..##..##..#',
  '#..o....o..#',
  '#....A.B...#',
  '######v#####',
]

const MAP_M2 = [
  '#####^######',
  '#..........#',
  '#.o..##..o.#',
  '#....##....#',
  '#..........#',
  '<...a..b...>',
  '#..........#',
  '#....##....#',
  '#.o..##..o.#',
  '#....A.B...#',
  '#####v######',
]

// MAP_C3 corregido con ^ y v en el centro (columna 7)
const MAP_C3 = [
  '#######^#######',
  '#.............#',
  '#.##.....##...#',
  '#.##.....##...#',
  '#..........o..#',
  '<.............>',
  '#.o...........#',
  '#..##.....##..#',
  '#..##.....##..#',
  '#.............#',
  '#######v#######',
]

// MAP_B2 corregido con ^ y v en el centro (columna 7)
const MAP_B2 = [
  '#######^#######',
  '#.P...........#',
  '#.###....###..#',
  '#.#........#..#',
  '#.#..a..b..#..#',
  '<.............>',
  '#.#..A..B..#..#',
  '#.#........#..#',
  '#.###....###..#',
  '#.............#',
  '#######v#######',
]

// MAP_GOAL corregido con ^ y v en el centro (columna 8)
const MAP_GOAL = [
  '########^#######',
  '#..............#',
  '#..o........o..#',
  '#....##..##....#',
  '#..............#',
  '#..a........b..#',
  '<...A......B...>',
  '#..............#',
  '#....##..##....#',
  '#..o........o..#',
  '#..............#',
  '#..............#',
  '########v#######',
]

// ── enemigos por dificultad ───────────────────────────────────────
const ENEMIES_C1 = [
  { type: 'pacer', col: 2, row: 3 },
  { type: 'chaser', col: 4, row: 9 },
]

const ENEMIES_M1 = [
  { type: 'shooter', col: 5, row: 2 },
  { type: 'charger', col: 6, row: 7 },
]

const ENEMIES_C2 = [
  { type: 'chaser', col: 1, row: 4 },
  { type: 'charger', col: 9, row: 6 },
  { type: 'shooter', col: 5, row: 5 },
]

const ENEMIES_C3 = [
  { type: 'shooter', col: 7, row: 1 },
  { type: 'charger', col: 12, row: 4 },
  { type: 'chaser', col: 5, row: 9 },
  { type: 'charger', col: 7, row: 9 },
]

const ENEMIES_M2 = [
  { type: 'charger', col: 1, row: 3 },
  { type: 'shooter', col: 10, row: 3 },
  { type: 'chaser', col: 9, row: 7 },
  { type: 'pacer', col: 2, row: 9 },
]

const ENEMIES_GOAL = [
  { type: 'chaser', col: 1, row: 4 },
  { type: 'charger', col: 14, row: 4 },
  { type: 'shooter', col: 1, row: 8 },
  { type: 'shooter', col: 14, row: 8 },
  { type: 'charger', col: 7, row: 10 },
]

// ── grilla 3x3 ────────────────────────────────────────────────────
export const ROOMS = [
  {
    id: 'start',
    col: 0,
    row: 0,
    type: 'empty',
    map: MAP_START,
    isStart: true,
  },
  {
    id: 'c1',
    col: 1,
    row: 0,
    type: 'combat',
    map: MAP_C1,
    enemies: ENEMIES_C1,
  },
  {
    id: 'b1',
    col: 2,
    row: 0,
    type: 'boxes',
    map: MAP_B1,
  },
  {
    id: 'm1',
    col: 0,
    row: 1,
    type: 'mixed',
    map: MAP_M1,
    enemies: ENEMIES_M1,
  },
  {
    id: 'c2',
    col: 1,
    row: 1,
    type: 'combat',
    map: MAP_C2,
    enemies: ENEMIES_C2,
  },
  {
    id: 'c3',
    col: 2,
    row: 1,
    type: 'combat',
    map: MAP_C3,
    cols: 15,
    enemies: ENEMIES_C3,
  },
  {
    id: 'm2',
    col: 0,
    row: 2,
    type: 'mixed',
    map: MAP_M2,
    enemies: ENEMIES_M2,
  },
  {
    id: 'b2',
    col: 1,
    row: 2,
    type: 'boxes',
    map: MAP_B2,
    cols: 15,
  },
  {
    id: 'goal',
    col: 2,
    row: 2,
    type: 'mixed',
    map: MAP_GOAL,
    cols: 16,
    rows: 13,
    enemies: ENEMIES_GOAL,
    isGoal: true,
  },
]

export const START_ROOM = ROOMS.find((r) => r.isStart)

export function roomAt(col, row) {
  return ROOMS.find((r) => r.col === col && r.row === row) || null
}

export function neighborsOf(room) {
  const out = []
  for (const [name, d] of Object.entries(DIRS)) {
    const nb = roomAt(room.col + d.dc, room.row + d.dr)
    if (nb) out.push({ dir: name, room: nb })
  }
  return out
}

export function doorCount(room) {
  return neighborsOf(room).length
}

export function opposite(dir) {
  return { N: 'S', S: 'N', E: 'W', W: 'E' }[dir]
}

export function validateGrid() {
  const warnings = []
  for (const room of ROOMS) {
    const cols = roomCols(room)
    const rows = roomRows(room)
    if (room.map.length !== rows) {
      warnings.push(`${room.id}: ${room.map.length} filas != ${rows}`)
    }
    room.map.forEach((line, i) => {
      if (line.length !== cols) {
        warnings.push(`${room.id}: fila ${i} mide ${line.length} != ${cols}`)
      }
    })
    for (const e of room.enemies || []) {
      if (!ENEMY_TYPES.includes(e.type)) {
        warnings.push(`${room.id}: tipo de enemigo desconocido '${e.type}'`)
      }
      const ch = room.map[e.row]?.[e.col]
      if (ch === undefined) {
        warnings.push(`${room.id}: enemigo fuera del mapa (${e.col},${e.row})`)
      } else if (isWall(ch)) {
        warnings.push(
          `${room.id}: enemigo ${e.type} en celda bloqueada (${e.col},${e.row})`
        )
      }
    }
    for (const { dir, room: nb } of neighborsOf(room)) {
      const back = opposite(dir)
      const hasBack = neighborsOf(nb).some((n) => n.dir === back)
      if (!hasBack) {
        warnings.push(`Puerta asimetrica: ${room.id}.${dir} -> ${nb.id} sin par`)
      }
    }
  }
  return warnings
}