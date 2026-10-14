import generateRoom from '../src/game/roomGenerator.js'

// Constantes de la caja y de la zona, derivadas de box.js y door.js
const BOX_SIZE = 40
const PLATFORM_HEIGHT = 32
const HALF_BOX = BOX_SIZE / 2
const HALF_PLAT = PLATFORM_HEIGHT / 2
const WIDTH = 840

let rooms = 0
let elevatedTotal = 0
let bad = []

const floorStats = new Map()

for (let floor = 6; floor <= 120; floor++) {
  const runs = 40

  for (let r = 0; r < runs; r++) {
    const room = generateRoom(floor)
    rooms++

    const errs = []

    // --- plataformas (incluida la del piso) ---
    const platforms = [...room.ledges, room.floor]
    const tops = platforms.map((p) => ({ ...p, top: p.y - HALF_PLAT, left: p.x - p.w / 2, right: p.x + p.w / 2 }))

    if (tops.some((p) => p.w <= 0)) errs.push('plataforma con ancho <= 0')
    if (room.ledges.some((p) => p.top < 0 || p.top > 900)) errs.push('plataforma fuera de pantalla')
    const floorTop = tops.find((p) => p.y === room.floor.y && p.w === room.floor.w)
    if (!floorTop || floorTop.top !== 928) errs.push(`piso mal: ${floorTop && floorTop.top}`)

    // cada caja debe estar apoyada sobre algo
    for (const b of room.boxes) {
      const under = tops.find((p) => Math.abs(b.y + HALF_BOX - p.top) < 2 && b.x > p.left && b.x < p.right)
      if (!under) errs.push(`caja ${b.colorId} en ${b.x},${b.y} sin apoyo`)
      if (b.x < 30 || b.x > 810) errs.push(`caja ${b.colorId} pegada al borde`)
    }

    // --- una caja y una zona por color ---
    const boxColors = room.boxes.map((b) => b.colorId).sort()
    const zoneColors = room.zones.map((z) => z.colorId).sort()
    if (boxColors.join() !== zoneColors.join()) {
      errs.push(`cajas[${boxColors}] vs zonas[${zoneColors}]`)
    }

    // --- zonas apoyadas sobre una plataforma ---
    for (const z of room.zones) {
      const under = tops.find((p) => Math.abs(z.y + 6 - p.top) < 2 && z.x > p.left - 10 && z.x < p.right + 10)
      if (!under) errs.push(`zona ${z.colorId} en ${z.x},${z.y} sin apoyo`)
    }

    // --- zonas separadas entre si ---
    for (let i = 0; i < room.zones.length; i++) {
      for (let j = i + 1; j < room.zones.length; j++) {
        if (Math.abs(room.zones[i].x - room.zones[j].x) < 50 && Math.abs(room.zones[i].y - room.zones[j].y) < 20) {
          errs.push(`zonas ${room.zones[i].colorId}/${room.zones[j].colorId} superpuestas`)
        }
      }
    }

    // --- la puerta no esta tapada por una zona ---
    for (const z of room.zones) {
      if (Math.abs(z.x - room.door.x) < 50 && z.y > 860) errs.push(`zona ${z.colorId} tapa la puerta`)
    }

    // --- nada de peligro encima de una zona ---
    for (const z of room.zones) {
      for (const s of room.spikes) {
        if (Math.abs(s.x - z.x) < s.w / 2 + 40 && Math.abs(s.y - z.y) < 60) errs.push(`pua sobre zona ${z.colorId}`)
      }
      for (const e of room.enemies) {
        if (Math.abs(e.x - z.x) < 70 && Math.abs(e.y - z.y) < 60) errs.push(`enemigo sobre zona ${z.colorId}`)
      }
    }

    // --- las tiras de púas caen ENTERAS dentro de su plataforma ---
    for (const s of room.spikes) {
      const host = tops.find((p) => Math.abs(s.y - p.top) < 2)
      if (!host) { errs.push(`pua sin plataforma (y=${s.y})`); continue }
      if (s.x - s.w / 2 < host.left || s.x + s.w / 2 > host.right) {
        errs.push(`pua colgando: tira ${s.x - s.w / 2}..${s.x + s.w / 2} vs plataforma ${host.left}..${host.right}`)
      }
      for (const b of room.boxes) {
        if (Math.abs(b.y + HALF_BOX - host.top) < 2 && Math.abs(b.x - s.x) < s.w / 2 + HALF_BOX) {
          errs.push(`pua encima de caja ${b.colorId}`)
        }
      }
      for (const e of room.enemies) {
        if (Math.abs(e.y + 18 - host.top) < 2 && e.right > s.x - s.w / 2 && e.left < s.x + s.w / 2) {
          errs.push(`pua encima de centinela`)
        }
      }
    }

    // --- el spawn no cae encima de una caja ni de un peligro ---
    {
      const spawnHost = tops.find((p) => room.spawn.x > p.left && room.spawn.x < p.right && room.spawn.y < p.top)
      if (spawnHost) {
        for (const b of room.boxes) {
          if (Math.abs(b.y + HALF_BOX - spawnHost.top) < 2 && Math.abs(b.x - room.spawn.x) < HALF_BOX + 20) {
            errs.push('spawn pegado a una caja')
          }
        }
        for (const e of room.enemies) {
          if (Math.abs(e.y + 18 - spawnHost.top) < 2 && e.right > room.spawn.x - 20 && e.left < room.spawn.x + 20) {
            errs.push('spawn pegado a un centinela')
          }
        }
        for (const s of room.spikes) {
          if (Math.abs(s.y - spawnHost.top) < 2 && s.x + s.w / 2 > room.spawn.x - 24 && s.x - s.w / 2 < room.spawn.x + 24) {
            errs.push('spawn pegado a una púa')
          }
        }
      }
    }

    // --- la patrulla de un centinela no pisa cajas ---
    for (const e of room.enemies) {
      for (const b of room.boxes) {
        if (Math.abs(b.y + HALF_BOX - (e.y + 18)) < 2 && b.x > e.left - HALF_BOX && b.x < e.right + HALF_BOX) {
          errs.push(`centinela patrulla sobre caja ${b.colorId}`)
        }
      }
    }

    // --- los enemigos quedan dentro de su plataforma ---
    for (const e of room.enemies) {
      const host = tops.find((p) => Math.abs(e.y + 18 - p.top) < 2)
      if (!host) errs.push(`enemigo en el aire (${e.x},${e.y})`)
      else if (e.left < host.left + 8 || e.right > host.right - 8) {
        errs.push(`enemigo se sale de la plataforma (${e.left}..${e.right} vs ${host.left}..${host.right})`)
      }
      if (e.left >= e.right) errs.push('patrulla invertida')
    }

    // --- el spawn esta sobre una plataforma y no dentro de un peligro ---
    const spawnOk = tops.some((p) => room.spawn.x > p.left && room.spawn.x < p.right && room.spawn.y < p.top)
    if (!spawnOk) errs.push(`spawn ${room.spawn.x},${room.spawn.y} sin plataforma encima`)

    // --- los láseres no cortan ninguna plataforma (geometría real) ---
    // plataforma ocupa [top, top+32]; haz de laser ocupa [y-5, y+5]
    for (const l of room.lasers) {
      const beamLeft = l.side === 'left' ? 0 : WIDTH - l.length
      const beamRight = l.side === 'left' ? l.length : WIDTH
      const beamTop = l.levelY - 5
      const beamBottom = l.levelY + 5

      for (const p of tops) {
        if (p.y === room.floor.y && p.w === room.floor.w) continue
        const overlapsX = beamLeft < p.right && beamRight > p.left
        const overlapsY = beamTop < p.top + PLATFORM_HEIGHT && beamBottom > p.top
        if (overlapsX && overlapsY) {
          errs.push(`laser[${beamLeft}..${beamRight}] y=${l.levelY} corta plataforma top=${p.top}`)
        }
      }
    }

    const elevated = room.zones.filter((z) => z.y < 900).length
    elevatedTotal += elevated

    if (errs.length) {
      if (bad.length < 8) bad.push({ floor, errs })
    }

    const key = Math.floor((floor - 1) / 10) * 10
    if (!floorStats.has(key)) floorStats.set(key, { colors: 0, enemies: 0, spikes: 0, lasers: 0, n: 0 })
    const st = floorStats.get(key)
    st.colors += room.zones.length
    st.enemies += room.enemies.length
    st.spikes += room.spikes.length
    st.lasers += room.lasers.length
    st.n++
  }
}

console.log(`Habitaciones generadas: ${rooms}`)
console.log(`Zonas elevadas totales: ${elevatedTotal} (promedio ${(elevatedTotal / rooms).toFixed(2)} por sala)`)
console.log('')
console.log('Dificultad por tramo de pisos:')
console.log('  pisos | cajas | enemigos | pusas | láseres')
for (const [k, v] of [...floorStats.entries()].sort((a, b) => a[0] - b[0])) {
  console.log(
    `  ${String(k).padStart(6)} | ${(v.colors / v.n).toFixed(1).padStart(5)} | ${(v.enemies / v.n)
      .toFixed(1)
      .padStart(7)} | ${(v.spikes / v.n).toFixed(1).padStart(5)} | ${(v.lasers / v.n).toFixed(1).padStart(7)}`
  )
}
console.log('')
if (bad.length) {
  console.log(`FALLOS: ${bad.length} muestras con problemas`)
  bad.forEach((b) => console.log(`  piso ${b.floor}: ${b.errs.join(' | ')}`))
  process.exitCode = 1
} else {
  console.log(`OK - las ${rooms} habitaciones respetan todas las reglas de solubilidad`)
}