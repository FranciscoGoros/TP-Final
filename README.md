# ESCARABOX

Videojuego de acción y puzzles **top-down** desarrollado con Phaser 4. Explora una red de habitaciones conectadas, combate centinelas y empuja cajas hasta sus zonas para abrir las puertas. El objetivo es despejar la habitación final.

## Alumno

- Francisco Gorosito

## Tecnologías

- JavaScript
- Node.js
- Vite
- Phaser 4

## Requisitos

- Node.js y npm

## Instalación y ejecución

```bash
npm install
npm run dev
```

Para generar y previsualizar el build de producción:

```bash
npm run build
npm run preview
```

## Cómo jugar

El botón **JUGAR** del menú inicia el modo top-down. Recorre las habitaciones por las puertas de las paredes. En las salas de combate, derrota a todos los enemigos; en las salas de cajas, coloca cada caja en la zona de su color; las salas mixtas requieren completar ambos objetivos. Las puertas permanecen bloqueadas mientras quede una tarea pendiente. Despeja la habitación **GOAL** para ganar.

El mapa tiene **9 habitaciones organizadas en una grilla 3×3**: salas de tránsito, combate, puzzles de cajas y desafíos mixtos. Las habitaciones se conectan por puertas en las paredes, y sus diseños pueden tener distintos tamaños.

### Controles

| Acción | Control |
|---|---|
| Moverse en cuatro direcciones | Flechas o WASD |
| Atacar cuerpo a cuerpo | X |
| Empujar cajas | C |
| Cerrar la ayuda inicial | Espacio, Enter o Escape |

### Combate y vidas

Hay cuatro arquetipos de enemigos: patrulleros, perseguidores, cargadores que avisan antes de embestir y tiradores que lanzan proyectiles. El ataque cuerpo a cuerpo puede eliminarlos; los enemigos más resistentes requieren varios golpes.

El jugador comienza con **3 vidas**. Al recibir daño obtiene un breve período de invulnerabilidad. Las vidas se conservan al viajar entre habitaciones y al reaparecer tras una muerte. Si se agotan, aparece Game Over; desde allí se puede reiniciar el prototipo o volver al menú.

Cada tres habitaciones hay un **corazón recolectable** que recupera 1 vida. Si ya tienes las 3 vidas, el corazón permanece en la habitación hasta que recibas daño.

## Arquitectura

- `src/main.js`: configuración del juego y registro de escenas.
- `src/game/scenes/MenuScene.js`: menú, controles y ayuda; **JUGAR** inicia el prototipo.
- `src/game/scenes/TopDownTestScene.js`: exploración, combate, puzzles, puertas, HUD y transiciones.
- `src/game/topDownRooms.js`: grilla de habitaciones, mapas, conexiones y datos de enemigos.
- `src/game/enemyAI.js`: lógica de IA independiente de Phaser.
- `src/game/enemyAI.test.js`: pruebas automatizadas de los comportamientos de la IA.
- `src/game/ui.js`: elementos visuales reutilizables de la interfaz.
- `src/game/lives.js`: contador de vidas compartido.
- `src/game/scenes/GameOverScene.js` y `VictoryScene.js`: pantallas de derrota y victoria.

### Diseño de habitaciones

Los mapas se definen como filas de caracteres en `topDownRooms.js`. Cada celda mide 64 px; las dimensiones por defecto son 12×11, y una habitación puede especificar sus propias `cols` y `rows`.

| Símbolo | Significado |
|---|---|
| `#` | Muro |
| `o` | Pilar |
| `.` | Piso |
| `P` | Posición inicial del jugador |
| `a`, `b` | Cajas |
| `A`, `B` | Zonas para cajas |
| `^`, `v`, `<`, `>` | Vano de puerta norte, sur, oeste o este |

Las puertas disponibles se determinan según la posición de cada habitación en la grilla. Al modificar mapas, conservar sus dimensiones declaradas, alinear puertas entre vecinas y comprobar que los pasillos permitan llegar a ellas y completar los puzzles.

## Pruebas

Ejecutar las pruebas de la IA y compilar para producción:

```bash
npm test
npm run build
```
