// Generador de habitaciones procedurales para el modo roguelite.
//
// REGLA DE ORO: una zona siempre tiene una caja que puede alcanzarla.
// Las zonas NO salen al azar: se colocan siguiendo estas reglas (ver AGENTS.md):
//  - Patron serpiente: las plataformas alternan izquierda/derecha con caidas
//    de 90-130px, para que siempre exista un camino de bajada.
//  - Las cajas NACEN arriba y terminan ABAJO: al empujarlas caen de nivel
//    hasta el piso, asi que empujarlas por el piso siempre las lleva a su
//    zona. Es el caso seguro y por eso es el mayoritario.
//  - Como maximo 1 zona va elevada, y solo cuando su caja ya esta en esa
//    misma plataforma: alcanza con empujarla en linea recta, nunca cae.
//  - Pusas y centinelas se buscan en el hueco libre de cualquier plataforma,
//    nunca encima de una caja ni de una zona.
//
// Medidas (derivadas de los niveles hechos a mano):
//  - tope de plataforma = y - 16   (PLATFORM_HEIGHT = 32, ocupa top..top+32)
//  - caja de 40x40  -> centro y = tope - 20
//  - zona de 56x12   -> centro y = tope - 6
//  - haz de laser de 10 de alto -> centro +- 5

const WIDTH = 840
const PLATFORM_HEIGHT = 32
const BOX_SIZE = 40
const ZONE_W = 56
const ZONE_H = 12
const LEDGE_MIN_W = 160
const LEDGE_MAX_W = 290
const WIDE_LEDGE_MIN_W = 220
const LEDGE_MAX_TOP = 840
const EDGE_MARGIN = 12
const ZONE_GAP = 76
const DOOR_W = 48
const DOOR_H = 96
const DOOR_X = 790
const DOOR_Y = 880
const FIRST_PROCEDURAL_FLOOR = 6
const COLOR_ORDER = ['yellow', 'red', 'purple', 'green', 'cyan']

function randInt(lo, hi) {
  return Math.floor(lo + Math.random() * (hi - lo + 1))
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function platformTop(ledge) {
  return ledge.y - PLATFORM_HEIGHT / 2
}

// Plataformas en zigzag, de arriba hacia abajo.
function buildLedges(count) {
  const ledges = []
  let y = 406
  let side = 0

  for (let i = 0; i < count; i++) {
    const w = randInt(LEDGE_MIN_W, LEDGE_MAX_W)
    const x = side === 0 ? EDGE_MARGIN + w / 2 : WIDTH - EDGE_MARGIN - w / 2

    ledges.push({ x, y, w })
    y += randInt(90, 130)
    side = 1 - side
  }

  // Ninguna plataforma puede quedar pegada al piso (el jugador tiene que
  // poder pasar por debajo con una caja).
  return ledges.filter((l) => platformTop(l) < LEDGE_MAX_TOP)
}

function difficultyFor(floor) {
  const t = Math.max(0, floor - FIRST_PROCEDURAL_FLOOR)

  return {
    colorCount: Math.min(2 + Math.floor(t / 6), COLOR_ORDER.length),
    enemies: Math.min(1 + Math.floor(t / 4), 4),
    spikes: Math.min(1 + Math.floor(t / 5), 3),
    lasers: t >= 3 ? Math.min(1 + Math.floor((t - 3) / 6), 3) : 0,
  }
}

// Reparte zonas de color a lo largo del piso. Usa RANURAS divididas en vez de
// posiciones al azar: garantiza por construccion que dos zonas nunca quedan
// pegadas, sin depender de acertar un intento al azar.
function buildFloorZones(colors) {
  const floorTop = 944 - PLATFORM_HEIGHT / 2
  const usableLeft = 70
  const usableRight = DOOR_X - DOOR_W / 2 - 40
  const n = colors.length
  const span = usableRight - usableLeft
  const slot = span / n

  // Dentro de cada ranura se puede mover un poco, pero siempre dejando
  // ZONE_GAP como separacion minima entre zonas vecinas.
  const jitter = Math.max(0, (slot - ZONE_GAP) / 2)
  const centers = []

  for (let i = 0; i < n; i++) {
    const base = usableLeft + slot * (i + 0.5)
    centers.push(base + randInt(-Math.round(jitter), Math.round(jitter)))
  }

  // Barajar el orden para que los colores caigan en ranuras distintas cada vez.
  for (let i = centers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[centers[i], centers[j]] = [centers[j], centers[i]]
  }

  return colors.map((colorId, i) => ({
    x: Math.round(centers[i] / 4) * 4,
    y: floorTop - 6,
    w: ZONE_W,
    h: ZONE_H,
    colorId,
  }))
}

// Huecos verticales libres entre plataformas: el laser entra ahi para no
// cortar ninguna plataforma ni el recorrido del jugador.
function laserGaps(ledges) {
  const tops = ledges.map(platformTop).sort((a, b) => a - b)
  const HALF_BEAM = 5
  const MARGIN = 12
  const gaps = []

  if (tops.length) gaps.push([tops[0] - 84, tops[0] - PLATFORM_HEIGHT - HALF_BEAM - MARGIN])

  for (let i = 0; i < tops.length - 1; i++) {
    gaps.push([
      tops[i] + PLATFORM_HEIGHT + HALF_BEAM + MARGIN,
      tops[i + 1] - HALF_BEAM - MARGIN,
    ])
  }

  return gaps.filter(([lo, hi]) => hi > lo + 8 && lo > 360 && hi < 910)
}

// x ocupados por plataforma (cajas y zonas elevadas): lo que hay que esquivar.
function occupancyByLedge(ledges, boxes, elevatedZones) {
  const map = new Map()

  const host = (x, centerY, halfH) =>
    ledges.find(
      (l) =>
        Math.abs(centerY + halfH - platformTop(l)) < 2 &&
        x > l.x - l.w / 2 &&
        x < l.x + l.w / 2
    )

  const push = (ledge, x) => {
    if (!ledge) return
    if (!map.has(ledge)) map.set(ledge, [])
    map.get(ledge).push(x)
  }

  for (const b of boxes) push(host(b.x, b.y, BOX_SIZE / 2), b.x)
  for (const z of elevatedZones) push(host(z.x, z.y, 6), z.x)

  return map
}

function freeStrip(ledge, occupied) {
  const left = ledge.x - ledge.w / 2
  const right = ledge.x + ledge.w / 2
  const w = Math.min(96, right - left - 36)
  if (w < 60) return null

  for (let i = 0; i < 14; i++) {
    // x es el CENTRO de la tira. Redondear a múltiplo de 4 puede pasarse 1-2px
    // del borde, así que después del redondeo clampeamos.
    const raw = Math.round(randInt(left + w / 2, right - w / 2) / 4) * 4
    const x = Math.min(right - w / 2, Math.max(left + w / 2, raw))
    if (occupied.every((o) => Math.abs(o - x) > w / 2 + 48)) return { x, w }
  }

  return null
}

function freePatrol(ledge, occupied) {
  const left = ledge.x - ledge.w / 2 + 26
  const right = ledge.x + ledge.w / 2 - 26
  const maxSpan = right - left
  if (maxSpan < 40) return null

  for (let i = 0; i < 14; i++) {
    const span = Math.round(randInt(50, maxSpan) / 4) * 4
    if (span < 40 || span > maxSpan) continue

    const x = Math.round(randInt(left + span / 2, right - span / 2) / 4) * 4
    if (occupied.every((o) => Math.abs(o - x) > span / 2 + 52)) {
      return { x, left: x - span / 2, right: x + span / 2 }
    }
  }

  return null
}

// Dónde cae el jugador. Elige la plataforma y el punto MÁS alejados de
// cualquier caja, prefiriendo la de más arriba si hay empate.
function pickSpawn(ledges, boxes) {
  let best = null

  for (const ledge of ledges) {
    const here = boxes.filter((b) => Math.abs(b.y + BOX_SIZE / 2 - platformTop(ledge)) < 2)
    const left = Math.round(ledge.x - ledge.w / 2 + 30)
    const right = Math.round(ledge.x + ledge.w / 2 - 30)

    let bestX = Math.round(ledge.x)
    let bestDist = -1

    for (let x = left; x <= right; x += 4) {
      const dist = here.length
        ? here.reduce((min, b) => Math.min(min, Math.abs(b.x - x)), Infinity)
        : Infinity
      if (dist > bestDist) {
        bestDist = dist
        bestX = x
      }
    }

    // '>' estricto: como ledges viene de arriba hacia abajo, gana la más alta.
    if (!best || bestDist > best.dist) best = { ledge, x: bestX, dist: bestDist }
    if (bestDist === Infinity) break
  }

  return best
}

export default function generateRoom(floor) {
  const diff = difficultyFor(floor)
  const colors = COLOR_ORDER.slice(0, diff.colorCount)

  const ledges = buildLedges(randInt(4, 6))
  const floorPlatform = { x: WIDTH / 2, y: 944, w: WIDTH }

  // El jugador aparece sobre la plataforma más alta.
  const spawnLedge = ledges[0]

  // Plataformas donde nacen las cajas (las mas altas).
  const spawnLedges = ledges.slice(0, Math.max(2, Math.min(4, ledges.length - 1)))

  // Decidimos PRIMERO si hay zona elevada, y recien despues repartimos las
  // cajas. Si no, el reparto ya habria corrido con el array de colores
  // modificado y las plataformas quedaban desfasadas.
  const elevated = []
  const wideLedges = ledges.filter((l) => l.w >= WIDE_LEDGE_MIN_W && !spawnLedges.includes(l))

  if (wideLedges.length && Math.random() < 0.55) {
    const ledge = pick(wideLedges)
    const zoneX = Math.round(ledge.x + ledge.w / 2 - ZONE_W / 2 - 10)
    const boxX = Math.round(ledge.x - ledge.w / 2 + BOX_SIZE / 2 + 10)

    if (zoneX - boxX > BOX_SIZE + 40) {
      elevated.push({
        ledge,
        boxX,
        zone: { x: zoneX, y: platformTop(ledge) - 6, w: ZONE_W, h: ZONE_H, colorId: colors[0] },
      })
    }
  }

  const boxColors = colors.slice(elevated.length)

  // Una plataforma por caja, sin repetir: evita cajas apiladas.
  const usedLedges = new Set()
  const boxes = []

  for (let i = 0; i < boxColors.length; i++) {
    let ledge = spawnLedges[i % spawnLedges.length]
    if (usedLedges.has(ledge)) {
      ledge = spawnLedges.find((l) => !usedLedges.has(l)) || ledge
    }
    usedLedges.add(ledge)

    // OJO: para ajustar al multiplo de 4 hay que dividir ANTES de redondear.
    // Math.round(x) * 4 multiplica y mandaba las cajas fuera de pantalla.
    boxes.push({
      x: Math.round((ledge.x + randInt(-30, 30)) / 4) * 4,
      y: platformTop(ledge) - 20,
      colorId: boxColors[i],
    })
  }

  elevated.forEach((e, i) => {
    boxes.push({ x: e.boxX, y: platformTop(e.ledge) - 20, colorId: colors[i] })
  })

  const elevatedZones = elevated.map((e) => e.zone)
  const zones = [...elevatedZones, ...buildFloorZones(boxColors)]

  // El spawn se calcula DESPUÉS de las cajas para poder esquivarlas, y se
  // suma a los lugares ocupados: ni púas ni centinelas le barriers el paso.
  const spawnSpot = pickSpawn(ledges, boxes)
  const spawn = {
    x: spawnSpot.x,
    y: platformTop(spawnSpot.ledge) - 16 - 60,
  }

  const occupied = occupancyByLedge(ledges, boxes, elevatedZones)
  const occupiedOf = (l) => {
    // Devuelve SIEMPRE el array guardado en el mapa: si la plataforma todavía
    // no tenía nada ocupado, lo creamos acá para que los push posteriores
    // (púas) queden registrados y los centinelas los esquiven.
    if (!occupied.has(l)) occupied.set(l, [])
    return occupied.get(l)
  }
  occupiedOf(spawnSpot.ledge).push(spawn.x)

  const order = [...ledges].sort(() => Math.random() - 0.5)

  const spikes = []
  for (let i = 0; i < diff.spikes; i++) {
    for (const ledge of order) {
      const strip = freeStrip(ledge, occupiedOf(ledge))
      if (!strip) continue
      spikes.push({
        x: strip.x,
        y: platformTop(ledge),
        w: strip.w,
        count: Math.max(2, Math.round(strip.w / 30)),
      })
      // La tira pasa a ser zona ocupada: los centinelas de abajo la esquivan.
      occupiedOf(ledge).push(strip.x)
      break
    }
  }

  const enemies = []
  for (let i = 0; i < diff.enemies; i++) {
    for (const ledge of order) {
      const patrol = freePatrol(ledge, occupiedOf(ledge))
      if (!patrol) continue
      enemies.push({
        x: patrol.x,
        y: platformTop(ledge) - 18,
        left: patrol.left,
        right: patrol.right,
        speed: randInt(48, 66),
      })
      break
    }
  }

  const lasers = []
  const gaps = laserGaps(ledges)

  for (let i = 0; i < diff.lasers; i++) {
    if (!gaps.length) break
    const gap = gaps.splice(Math.floor(Math.random() * gaps.length), 1)[0]
    lasers.push({
      side: Math.random() < 0.5 ? 'left' : 'right',
      levelY: Math.round(randInt(gap[0], gap[1]) / 2) * 2,
      length: randInt(180, 340),
      onMs: randInt(1800, 2100),
      offMs: 1500,
      phase: i * 600,
    })
  }

  return {
    floor: floorPlatform,
    ledges,
    zones,
    boxes,
    spikes,
    enemies,
    lasers,
    door: { x: DOOR_X, y: DOOR_Y, w: DOOR_W, h: DOOR_H },
    spawn,
  }
}