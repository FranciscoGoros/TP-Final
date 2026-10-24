# AGENTS.md

## Proyecto

ESCARABOX es un videojuego en Phaser 4 con dos modos implementados:

- **Puzzle-platformer 2D**: modo original descrito en `ESCARABOX - GDD.docx` y `ESCARABOX - GDD.pdf`. El jugador empuja cajas de colores hacia zonas del mismo color para abrir la puerta; hay púas, láseres, centinelas y 3 vidas.
- **Prototipo top-down**: modo jugable que inicia actualmente el botón **JUGAR** del menú. Toma referencias de Zelda/Isaac y combina exploración de habitaciones, combate y puzzles Sokoban.

El GDD original propone 3 niveles. El platformer actual tiene 5 habitaciones continuas; el prototipo top-down es una incorporación independiente y no reemplaza sus sistemas ni sus mapas.

## Comandos

- `npm install` — instalar dependencias.
- `npm run dev` — servidor de desarrollo con HMR.
- `npm run build` — build de producción a `dist/`.
- `npm run preview` — previsualizar el build.
- `npm test` o `npm run test` — ejecutar pruebas con `node --test`.

No hay scripts de lint ni typecheck. Para validar cambios, ejecutar las pruebas pertinentes y `npm run build`.

## Estructura relevante

```text
index.html
src/
  main.js                         # Configuración Phaser y registro de escenas
  style.css
  game/
    box.js, door.js, enemy.js     # Sistemas del platformer
    enemyAI.js                    # IA pura del prototipo top-down
    enemyAI.test.js               # Pruebas node:test de la IA
    hud.js, lives.js, timer.js, ui.js
    lasers.js, spikes.js, player.js
    levels.js                     # Datos de las 5 habitaciones platformer
    topDownRooms.js               # Mapas y datos del prototipo
    scenes/
      MenuScene.js
      GameScene.js                # Platformer continuo
      TopDownTestScene.js         # Prototipo top-down
      GameOverScene.js
      VictoryScene.js
```

## Escenas y modos

- `src/main.js` registra todas las escenas. Registrar allí cualquier escena nueva.
- El menú **JUGAR** inicia `TopDownTest`. El menú no inicia `GameScene` actualmente.
- `TopDownTestScene` es un prototipo separado: sus mapas, físicas, combate y viaje no deben acoplarse a `GameScene`.
- `GameScene` conserva el platformer original en una sola escena. `LEVELS` contiene 5 habitaciones en `src/game/levels.js`; cada habitación nueva se construye a la derecha con `ROOM_WIDTH = 840`, la cámara panea y la anterior se destruye al recibir `PAN_COMPLETE`. El callback de `camera.pan()` se ejecuta en cada frame: no usarlo como callback de finalización.
- Al perder todas las vidas, `GameOverScene` usa `{ level, floor }`. En el platformer, reintentar reconstruye la habitación alcanzada y reinicia las 3 vidas. En el prototipo top-down, la muerte con vidas restantes reinicia la escena conservando las vidas; al llegar a cero, Game Over permite volver al inicio del prototipo.
- Completar la quinta habitación del platformer o despejar la sala `isGoal` del prototipo conduce a `Victory`.

## Platformer: mecánicas y reglas

- Movimiento con flechas, salto con Espacio, ataque cuerpo a cuerpo con **X** y empujón vertical de caja con **C**. La **C** levanta una caja adyacente mientras el jugador está en el suelo; sirve para recuperar cajas caídas, no para transportarlas libremente.
- El jugador tiene 3 vidas para la partida y 1,2 s de invulnerabilidad parpadeante tras recibir daño. Las vidas se reinician al empezar desde el menú o reintentar desde Game Over, no al crear `GameScene`.
- Cada caja debe coincidir por color con su zona. La puerta se abre cuando todas las zonas reciben sus cajas.
- Las composiciones de nivel en `levels.js` son datos puros con coordenadas relativas a la habitación; al construir, sumar el offset horizontal donde corresponda.
- Al diseñar plataformas, preferir recorrido serpenteante/zigzag con desniveles aproximados de 90–130 px, no una escalera vertical exacta. Plataformas de 32 px; cajas de 40×40 px y jugador de 32×32 px.
- Las zonas elevadas deben poder alcanzarse: las cajas caen por los bordes y pueden recuperarse con C. Evitar superponer púas con cajas o zonas, dar margen generoso alrededor de los láseres y ubicar la puerta en el piso a la derecha.
- Los peligros deben usar `this.gameOverTriggered`, pausar físicas, ocultar al jugador y, al agotarse las vidas, hacer `fadeOut` y cambiar a `GameOver` tras `FADE_OUT_COMPLETE`.
- `SpikeSystem`, `LaserSystem`, `EnemySystem` y `DoorSystem` tienen `destroy()` para retirar objetos, overlaps y colliders al abandonar una habitación.
- `LaserSystem` recibe `offsetX` porque calcula su posición respecto del ancho de escena.

## Prototipo top-down: mapas y mecánicas

- `ROOMS` en `src/game/topDownRooms.js` define una grilla lógica de 3×3 con 9 habitaciones: `empty`, `combat`, `boxes` y `mixed`. Las dimensiones por defecto son 12×11 celdas, pero cada mapa puede definir `cols` y `rows`; cada celda mide `TILE = 64`.
- Las habitaciones son datos con `id`, `col`, `row`, `type`, `map` y, según corresponda, `enemies`, `isStart` o `isGoal`. Las coordenadas de enemigos son índices de celda.
- Símbolos: `#` muro, `o` pilar, `.` piso, `P` aparición, `a`/`b` cajas, `A`/`B` zonas, `D` pedestal y `^ v < >` puertas.
- Las puertas transitables se derivan de los vecinos reales (`neighborsOf`). Mantener los marcadores de puerta alineados entre habitaciones vecinas; si no existe vecino, el vano se convierte en muro. `findDoorPosition` usa la posición marcada en el mapa; no asumir una columna/fila central fija.
- `getGrid()` abre espacio frente a puertas válidas y talla pasillos para conectar puertas y aparición si el diseño las deja aisladas. `validateGrid()` informa inconsistencias de tamaño y datos de enemigos; revisar esos avisos y probar la conectividad y la solución de cajas al editar mapas. No hay un solver Sokoban implementado.
- Las puertas se bloquean físicamente mientras quede pendiente la tarea de la sala: eliminar enemigos en `combat`, colocar cajas en `boxes` o ambas en `mixed`. Las salas despejadas conservan el estado durante la partida y no vuelven a generar enemigos.
- El viaje entre salas usa un fade corto; `enterRoom()` limpia los colliders y objetos de la sala anterior. Mantener `roomObjects`, `roomColliders` y el grupo `walls` sincronizados al añadir entidades.
- En este modo, flechas o WASD mueven en cuatro direcciones, **X** ataca y **C** empuja cajas. La C no tiene aquí la mecánica de empujón vertical del platformer.
- `enemyAI.js` contiene lógica pura, sin Phaser. Arquetipos: `pacer`, `chaser`, `charger` y `shooter`; incluyen patrulla, persecución con línea de visión, embestida telegrafiada y proyectiles. Los enemigos tienen HP variable y el objetivo duplica su HP. Mantener las pruebas en `enemyAI.test.js`.
- Las vidas son globales y no se reinician al cambiar de habitación. El objetivo `isGoal` termina el prototipo al despejarse.
- Hay un corazón recolectable en una habitación de cada grupo de tres (órdenes 2, 5 y 8 de `ROOMS`). Recupera una vida hasta el máximo de 3; si el jugador está a vida completa, permanece disponible. Registrar su ubicación en `healthPickup` y conservar el estado `healthPickupCollected` por habitación.

## Phaser 4 y físicas

- No usar `Phaser.Math.Min/Max`; usar `Math.min/max`.
- `getBounds()` no expone `.center`; usar `centerX` y `centerY`.
- Verificar las APIs contra la versión Phaser 4 instalada en `node_modules/phaser`; no asumir que una API de Phaser 3 existe.
- `physics.add.existing(rect, true)` crea un cuerpo estático. Los cuerpos con `body.enable = false` se omiten de forma segura en overlaps/colliders, y los arrays pueden ser objetivos de colisión.
- Arcade Physics es un mundo compartido; cada escena debe registrar y limpiar sus propios colliders y overlaps.
- En el platformer, `physics.world.setBounds()` debe abarcar las habitaciones recorridas por la cámara.

## Nota de diseño

El GDD (DOCX/PDF) es la referencia del concepto original del platformer (movimiento, cajas, peligros, centinelas, ataque con X y pantallas de victoria/derrota). Antes de modificar controles o reglas compartidas, comprobar el modo afectado: el platformer y el prototipo top-down tienen flujos y comportamiento de la tecla C distintos.
