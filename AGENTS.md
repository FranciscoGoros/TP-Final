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
       ├── timer.js
       ├── hud.js
       └── scenes
          ├── MenuScene.js
          ├── Level1Scene.js
          ├── Level2Scene.js
          ├── Level3Scene.js
          ├── Level4Scene.js
          ├── Level5Scene.js
          ├── GameOverScene.js
          └── VictoryScene.js

## Cadena de puertas y flujo de escenas
Level1→'Level2' → 'Level3' → 'Level4' → 'Level5' → 'Victory'. El GameOver recibe {level} para reintentar.
Los niveles nuevos DEBEN registrarse en la lista de escenas de `src/main.js`. Mantener la cadena intacta al agregar/renombrar niveles.

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