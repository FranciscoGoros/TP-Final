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
 ├── scripts
 │    └── verify-rooms.js      (verificador del generador, corre a mano con node)
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
       ├── roomGenerator.js
       └── scenes
          ├── MenuScene.js
          ├── Level1Scene.js
          ├── Level2Scene.js
          ├── Level3Scene.js
          ├── Level4Scene.js
          ├── Level5Scene.js
          ├── RoomScene.js
          ├── GameOverScene.js
          └── VictoryScene.js

## Cadena de escenas y flujo
Menu → Level1→'Level2' → 'Level3' → 'Level4' → 'Level5' → 'Room' (infinito).
El GameOver recibe {level, floor} para reintentar; el piso se conserva al
reintentar para no reiniciar el descenso. VictoryScene quedo sin uso: en modo
roguelite la partida no tiene final, asi que sigue registrada en main.js pero
nadie llega a ella.
Los niveles nuevos DEBEN registrarse en la lista de escenas de `src/main.js`.
Mantener la cadena intacta al agregar/renombrar niveles.

## Modo roguelite (habitaciones procedurales)
- Pisos 1-5 = niveles hechos a mano, con su puerta y su cambio de escena.
- Del piso 6 en adelante NO hay puerta ni cambio de escena: todo pasa en una
  sola `RoomScene`. Al resolver el puzzle aparece un ASCENSOR; al pisarlo se
  genera la sala siguiente 960px más arriba, se destruye la anterior y la
  camara panea con `camera.pan()`. No usar `scene.restart()` ni `scene.start()`.
- OJO: el callback de `camera.pan()` corre en CADA frame, no al terminar.
  Para una sola vez hay que escuchar `Phaser.Cameras.Scene2D.Events.PAN_COMPLETE`.
- Las 3 vidas son para TODA la partida: solo se reinician en `MenuScene.onPlay()`.
- Los sistemas (spikes/lasers/enemies) tienen `destroy()` porque al ascender hay
  que sacarlos del mundo físico junto con los colliders.
- `physics.world.setBounds()` debe ser amplio: la camara se desplaza muchos pisos
  y con los límites por defecto el jugador quedaría encerrado.
- REGLA DEL GENERADOR: una zona siempre tiene una caja que puede alcanzarla.
  Las cajas nacen en plataformas altas y caen hasta el piso, asi que empujarlas
  por el piso siempre las lleva a su zona. Como maximo 1 zona va elevada, y solo
  con la caja ya en esa misma plataforma. Nunca pusas/centinelas encima de cajas,
  zonas ni del spawn.
- Correr `node scripts/verify-rooms.js` despues de tocar el generador: genera
  4600 habitaciones y valida las reglas de solubilidad.

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


## Notas
- Repositorio git inicializado; dist/ está en .gitignore.