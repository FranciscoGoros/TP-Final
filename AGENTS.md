# AGENTS.md

## Proyecto
Videojuego puzzle-platformer 2D en Phaser 4 creado para Desarrollo Tecnológico 2

## Comandos
- `npm run dev` — servidor de desarrollo con HMR
- `npm run build` — build de producción a `dist/`
- `npm run preview` — previsualizar el build
- NO existe script de test, lint ni typecheck — no inventarlos. Verificar los cambios con `npm run build`.

## Estructura

TP-Agentes
 ├── index.html
 ├── package.json
 ├── package-lock.json
 ├── vite.config.js
 ├── README.md
 ├── AGENTS.md
 └── src
    ├── main.js
    ├── style.css
    └── game
       ├── player.js
       ├── box.js
       ├── door.js
       ├── spikes.js
       ├── lasers.js
       ├── enemy.js
       ├── lives.js
       ├── timer.js
       ├── hud.js
       ├── levels.js
       └── scenes
          ├── MenuScene.js
          ├── GameScene.js
          ├── GameOverScene.js
          └── VictoryScene.js

## Cadena de escenas y flujo
Menu → Game (una sola escena con las 5 habitaciones) → Victory.
El GameOver recibe {level, floor} para reintentar la habitación; al reintentar
se conserva la habitación alcanzada y se resetean las 3 vidas.
Los niveles nuevos DEBEN registrarse en la lista de escenas de `src/main.js`.

## Juego continuo (5 habitaciones, una sola escena)
- Las 5 habitaciones viven en `GameScene` (key 'Game'). NO hay `scene.start`
  entre habitaciones: se construyen una AL LADO de la otra con un offset en X
  (ROOM_WIDTH = 840 por habitación).
- La composición de cada habitación está en `src/game/levels.js` como datos
  puros (ledges, floor, zones, door, boxes, spawn, spikes, lasers, enemies).
  Coordenadas RELATIVAS al origen de la habitación; `buildRoom(level, offsetX)`
  les suma el offset.
- Al entrar por la puerta abierta (`DoorSystem` con `onEnter`) se llama a
  `ascendToNext()`: se construye la habitación siguiente a la derecha, el
  jugador se reposiciona y `camera.pan()` desplaza la cámara. Al terminar el
  paneo se destruye la habitación anterior.
- OJO: el callback de `camera.pan()` corre en CADA frame, no al terminar.
  Para una sola vez hay que escuchar `Phaser.Cameras.Scene2D.Events.PAN_COMPLETE`.
- La habitación vieja NO se destruye hasta PAN_COMPLETE, para que durante el
  paneo se vean las dos habitaciones y no un hueco.
- Las 3 vidas son para TODA la partida: se reinician en `MenuScene.onPlay()` y
  al reintentar desde el GameOver, no en `GameScene.create()`.
- Los sistemas (spikes/lasers/enemies) y `DoorSystem` tienen `destroy()` porque
  al cambiar de habitación hay que sacarlos del mundo físico con sus colliders.
- `LaserSystem` recibe un `offsetX` porque calcula su posición con el ancho de
  la escena.
- `physics.world.setBounds()` debe ser amplio: la cámara se desplaza varias
  habitaciones y con los límites por defecto el jugador quedaría encerrado.
- Completar la habitación 5 (`roomIndex === LEVELS.length - 1`) llama a
  `finishGame()` → `scene.start('Victory')`.

## Reglas de diseño de niveles para agente
- Usar un patrón serpiente/zigzag para las plataformas. (alternar izquierda/derecha, caídas de ~90-130px);
  EVITAR layouts de escalera exácta (una plataforma encima de la otra).
- Altura de plataforma 32; tope = y-16. Las cajas de 40×40 quedan en center y = tope-20.
  El jugador 32×32 aparece arriba de P1.
- Las zonas elevadas de cajas deben ser alcanzables: la plataforma origen debe quedar por encima
  del destino y las cajas descienden rodando por el borde (deriva ≈ 110 px/s al caer).
  Mantener ≤2 zonas elevadas por nivel.
- Mantener margen generoso en láseres para que no sea muy injusto.
  Ubicar púas sin superponerse a cajas/zones. Puerta en el piso a la derecha.

## Errores de Phaser 4
- Phaser.Math.Min/Max NO existen → usar Math.min/max.
- getBounds() no tiene getter `.center` → usar centerX/centerY.
- Phaser.Math.Clamp existe y se usa en box.js.
- physics.add.existing(rect, true) = cuerpo estático; los cuerpos deshabilitados (body.enable=false)
  se omiten de forma segura en overlap/collide, y los arrays son objetivos de colisión válidos.
- Mundo Arcade único y compartido entre escenas: cada escena registra sus propios colliders/overlaps.
- No referenciar APIs que solo existen en Phaser 3 sin verificarlas contra node_modules/phaser.

## Patrón de muerte por peligro (niveles con hazards)
Proteger con `this.gameOverTriggered`; physics.pause(); player.setVisible(false);
cameras.main.fadeOut(400) → una vez FADE_OUT_COMPLETE → scene.start('GameOver', {level}).

## Prototipo top-down (Zelda/Isaac) — `TopDownTestScene` + `topDownRooms.js`
- Escena AISLADA de prueba (no toca GameScene/levels). Se accede desde el MENÚ
  (botón `PROTOTIPO TOP-DOWN`).
- Mapa de habitaciones en grilla lógica **3×3** (`ROOMS` en `src/game/topDownRooms.js`).
  Cada habitación = `{ id, col, row, type, map, enemies?, isStart?, isGoal? }`.
- Tipos: `empty` (tránsito), `combat` (matar enemigos), `boxes` (puzzle Sokoban),
  `mixed` (ambas).
- **Puertas en las paredes (N/S/E/O)**: se derivan de los vecinos reales
  (`neighborsOf`). En los mapas las letras `^ v < >` marcan el vano; si no hay
  vecino, esa celda se convierte en pared. Un solo vano por lado en col 5 (N/S) y
  row 5 (W/E); `doorRect`/`entryPoint` están anclados a esas celdas.
- Al cruzar una puerta (`checkDoors` → `travel`) se reconstruye la habitación
  vecina y el jugador aparece en el borde opuesto (`entryPoint`). Transición con
  fade corto (no pan). Los colliders y objetos se limpian via `this.roomColliders`
  + `this.roomObjects` + `walls.clear()`.
- **Room-lock estilo Isaac**: `applyDoorLock()` cierra las puertas (blocks físicos
  con `body.enable`) mientras la tarea esté pendiente y las abre al despejar
  (`onRoomCleared`). Las habitaciones ya despejadas no re-spawnean enemigos
  (`roomState[id].cleared`).
- La meta (`isGoal`) al despejarse llama a `scene.start('Victory')`.
- `lives` es global y NO se resetea al cambiar de habitación (solo al morir/reiniciar
  el prototipo → `scene.restart()`).
- Empuje Sokoban con `BOX_GAP = 6` (`boxWouldCollide`): no permite apilar/solapar cajas.
- **Tamaño por sala**: cada `ROOM` puede tener `cols`/`rows` (default 12×11); los
  helpers `roomCols/roomRows/roomOrigin/cellCenter(room,…)/doorCenter(room,dir)/
  doorRect(room,dir)/entryPoint(room,…)` son por-habitación. Las salas grandes
  crecen simétricas y las puertas quedan en el centro (`doorCol`/`doorRow`), así
  que siguen alineadas entre vecinas.
- **Símbolos de mapa**: `#` muro (rect), `o` pilar (círculo, misma física),
  `.` piso, `P` spawn, `a/b` cajas, `A/B` zonas, `D` pedestal, `^ v < >` puertas.
- **Siluetas distintas por arquetipo** (Zelda/Isaac): plaza abierta, cuatro
  pilares, pilares dispersos, anillo, cruz, bloque central, ruinas en L, nichos,
  santuario. **IA inteligente**: lógica pura en `src/game/enemyAI.js` (testeable
  con `node --test`). Arquetipos `pacer`/`chaser`/`charger`/`shooter` con **HP
  variable**, **línea de vista**, **embestida con telegraph**, **disparos**. Los
  enemigos se declaran en `ROOM.enemies = [{type, col, row}]` (no más `lanes`);
  escalado por anillo (exterior simple → interior complejo → jefe con vida x2).
  Siluetas distintas por arquetipo + flash al recibir daño.
- `TILE = 64`; validar cada mapa nuevo con flood-fill (conectividad) y un solver
  Sokoban antes de darlo por bueno. `npm run test` ejecuta los tests de IA.

## Notas
- Repositorio git inicializado; dist/ está en .gitignore.