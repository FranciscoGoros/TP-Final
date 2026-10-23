// Las 5 habitaciones del juego, en orden. Mismo diseño que tenian las
// escenas Level1-5, pero como datos puros para que GameScene las construya
// una al lado de la otra sin cortar la escena. Todas las coordenadas son
// RELATIVAS al origen de su habitación (0,0 = esquina superior izquierda
// de la pantalla); GameScene las offsetea en X al construirlas.
export const LEVELS = [
  {
    name: 'Habitación 1',
    ledges: [
      { x: 125, y: 416, w: 250 },
      { x: 195, y: 796, w: 250 },
      { x: 650, y: 716, w: 300 },
      { x: 400, y: 566, w: 280 },
    ],
    floor: { x: 320, y: 944, w: 1040 },
    zones: [
      { x: 400, y: 544, w: 56, h: 12, colorId: 'yellow' },
      { x: 530, y: 922, w: 56, h: 12, colorId: 'red' },
    ],
    door: { x: 785, y: 880, w: 48, h: 96 },
    boxes: [
      { x: 60, y: 370, colorId: 'yellow' },
      { x: 190, y: 370, colorId: 'red' },
    ],
    spawn: { x: 125, y: 284 },
    spikes: [],
    lasers: [],
    enemies: [{ x: 600, y: 910, left: 600, right: 740, speed: 50 }],
  },
  {
    name: 'Habitación 2',
    ledges: [
      { x: 125, y: 416, w: 250 },
      { x: 420, y: 556, w: 280 },
      { x: 720, y: 676, w: 240 },
      { x: 130, y: 776, w: 260 },
      { x: 710, y: 866, w: 260 },
    ],
    floor: { x: 420, y: 944, w: 840 },
    zones: [
      { x: 130, y: 754, w: 56, h: 12, colorId: 'yellow' },
      { x: 730, y: 922, w: 56, h: 12, colorId: 'red' },
      { x: 720, y: 844, w: 56, h: 12, colorId: 'purple' },
    ],
    door: { x: 490, y: 880, w: 48, h: 96 },
    boxes: [
      { x: 60, y: 370, colorId: 'yellow' },
      { x: 190, y: 370, colorId: 'red' },
      { x: 420, y: 520, colorId: 'purple' },
    ],
    spawn: { x: 125, y: 374 },
    spikes: [],
    lasers: [],
    enemies: [
      { x: 620, y: 642, left: 620, right: 810, speed: 55 },
      { x: 570, y: 910, left: 570, right: 690, speed: 50 },
    ],
  },
  {
    name: 'Habitación 3',
    ledges: [
      { x: 110, y: 406, w: 200 },
      { x: 695, y: 496, w: 190 },
      { x: 180, y: 556, w: 180 },
      { x: 650, y: 646, w: 200 },
      { x: 110, y: 746, w: 150 },
      { x: 550, y: 836, w: 180 },
      { x: 400, y: 700, w: 200 },
    ],
    floor: { x: 420, y: 944, w: 840 },
    zones: [
      { x: 180, y: 534, w: 56, h: 12, colorId: 'yellow' },
      { x: 730, y: 922, w: 56, h: 12, colorId: 'red' },
      { x: 520, y: 922, w: 56, h: 12, colorId: 'purple' },
    ],
    door: { x: 790, y: 880, w: 48, h: 96 },
    boxes: [
      { x: 60, y: 370, colorId: 'yellow' },
      { x: 190, y: 370, colorId: 'red' },
      { x: 695, y: 460, colorId: 'purple' },
    ],
    spawn: { x: 125, y: 374 },
    spikes: [
      { x: 650, y: 630, w: 110, count: 4 },
      { x: 110, y: 730, w: 90, count: 3 },
      { x: 550, y: 820, w: 100, count: 4 },
    ],
    lasers: [],
    enemies: [
      { x: 320, y: 666, left: 320, right: 480, speed: 60 },
      { x: 230, y: 910, left: 230, right: 420, speed: 50 },
    ],
  },
  {
    name: 'Habitación 4',
    ledges: [
      { x: 110, y: 406, w: 200 },
      { x: 695, y: 496, w: 190 },
      { x: 180, y: 556, w: 180 },
      { x: 650, y: 646, w: 200 },
      { x: 110, y: 746, w: 150 },
      { x: 550, y: 836, w: 180 },
      { x: 400, y: 700, w: 200 },
    ],
    floor: { x: 420, y: 944, w: 840 },
    zones: [
      { x: 180, y: 534, w: 56, h: 12, colorId: 'yellow' },
      { x: 730, y: 922, w: 56, h: 12, colorId: 'red' },
      { x: 520, y: 922, w: 56, h: 12, colorId: 'purple' },
      { x: 320, y: 922, w: 56, h: 12, colorId: 'green' },
    ],
    door: { x: 790, y: 880, w: 48, h: 96 },
    boxes: [
      { x: 60, y: 370, colorId: 'yellow' },
      { x: 190, y: 370, colorId: 'red' },
      { x: 675, y: 460, colorId: 'purple' },
      { x: 750, y: 460, colorId: 'green' },
    ],
    spawn: { x: 125, y: 374 },
    spikes: [
      { x: 650, y: 630, w: 110, count: 4 },
      { x: 110, y: 730, w: 90, count: 3 },
      { x: 550, y: 820, w: 100, count: 4 },
    ],
    lasers: [
      { side: 'right', levelY: 430, length: 460, onMs: 1800, offMs: 1500, phase: 0 },
      { side: 'right', levelY: 510, length: 380, onMs: 1800, offMs: 1500, phase: 500 },
      { side: 'left', levelY: 620, length: 170, onMs: 1800, offMs: 1500, phase: 1000 },
      { side: 'left', levelY: 790, length: 220, onMs: 1800, offMs: 1500, phase: 1500 },
    ],
    enemies: [
      { x: 320, y: 666, left: 320, right: 480, speed: 60 },
      { x: 570, y: 910, left: 570, right: 690, speed: 50 },
    ],
  },
  {
    name: 'Habitación 5',
    ledges: [
      { x: 110, y: 406, w: 200 },
      { x: 695, y: 496, w: 190 },
      { x: 180, y: 556, w: 180 },
      { x: 650, y: 646, w: 200 },
      { x: 110, y: 746, w: 150 },
      { x: 550, y: 836, w: 180 },
      { x: 400, y: 700, w: 200 },
    ],
    floor: { x: 420, y: 944, w: 840 },
    zones: [
      { x: 180, y: 534, w: 56, h: 12, colorId: 'yellow' },
      { x: 730, y: 922, w: 56, h: 12, colorId: 'red' },
      { x: 320, y: 922, w: 56, h: 12, colorId: 'purple' },
      { x: 560, y: 922, w: 56, h: 12, colorId: 'green' },
      { x: 550, y: 814, w: 56, h: 12, colorId: 'cyan' },
    ],
    door: { x: 790, y: 880, w: 48, h: 96 },
    boxes: [
      { x: 60, y: 370, colorId: 'yellow' },
      { x: 190, y: 370, colorId: 'red' },
      { x: 675, y: 460, colorId: 'purple' },
      { x: 750, y: 460, colorId: 'green' },
      { x: 520, y: 530, colorId: 'cyan' },
    ],
    spawn: { x: 125, y: 374 },
    spikes: [
      { x: 650, y: 630, w: 110, count: 4 },
      { x: 110, y: 730, w: 90, count: 3 },
    ],
    lasers: [
      { side: 'right', levelY: 430, length: 460, onMs: 1900, offMs: 1500, phase: 0 },
      { side: 'right', levelY: 510, length: 380, onMs: 2000, offMs: 1500, phase: 450 },
      { side: 'left', levelY: 620, length: 170, onMs: 1900, offMs: 1500, phase: 900 },
      { side: 'right', levelY: 710, length: 200, onMs: 2100, offMs: 1500, phase: 1350 },
      { side: 'left', levelY: 790, length: 240, onMs: 1900, offMs: 1500, phase: 1800 },
    ],
    enemies: [
      { x: 320, y: 666, left: 320, right: 480, speed: 60 },
      { x: 120, y: 910, left: 120, right: 260, speed: 50 },
      { x: 600, y: 910, left: 600, right: 680, speed: 55 },
    ],
  },
]
