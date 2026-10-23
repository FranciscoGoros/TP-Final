### Nombre del juego

**ESCARABOX** — Puzzle-platformer 2D en pantalla portrait (840×960): empujá cajas de colores sobre las zonas de su mismo color para desbloquear la puerta y avanzar. El juego tiene **5 habitaciones** y es **continuo**: las habitaciones se construyen una al lado de la otra dentro de una sola escena (`GameScene`), y al cruzar la puerta la cámara panea hacia la siguiente sin cortes. Una sola partida con 3 vidas y peligros como púas, láseres y enemigos centinela. Al completar la quinta habitación se muestra la pantalla de Victoria.

## Alumno

- Francisco Gorosito

## Tecnologías

- JavaScript
- Node.js
- Vite
- Phaser

## Instalación

npm install

## Ejecutar

npm run dev

## Build

npm run build

## Gameplay

Puzzle de empuje de cajas: cada zona del suelo (o de una plataforma) debe recibir una caja del mismo color. Mientras no se completen todas las zonas, la puerta de salida permanece cerrada. El jugador tiene **3 vidas**: tocar una púa, un láser activo o un enemigo quita una vida y otorga 1,2 s de invulnerabilidad parpadeante. Al llegar a 0 vidas se muestra el Game Over, con opción de reintentar la habitación (con las 3 vidas de nuevo) o volver al menú.

### Objetivo

Colocar cada caja sobre la zona de su mismo color para abrir la puerta y completar las 5 habitaciones consecutivas, que terminan en la pantalla de Victoria.

### Mecánicas principales

- Push de cajas: empujar (no arrastrar) con el cuerpo; las cajas se desplazan sobre las plataformas y pueden caer a niveles inferiores.
- 3 vidas **para toda la partida**: tocar una púa, un láser activo o un enemigo quita una vida y otorga 1,2 s de invulnerabilidad parpadeante. Al llegar a 0 vidas se muestra el Game Over con la habitación alcanzada.
- Empujón vertical: con **C**, estando sobre el suelo y al lado de una caja, el jugador la levanta y sube con ella. Sube ~160 px por pulsación (un nivel de plataforma), así que una caja caída se recupera empujándola plataforma a plataforma. Si no hay caja al lado, la C no hace nada.
- Ataque cuerpo a cuerpo: con **X** el jugador ejecuta un tajo corto hacia el lado al que mira. Dura ~130 ms con 320 ms de recarga.
- Enemigos centinela: patrullan un tramo fijo de plataforma y se los elimina de un solo golpe. No empujan cajas, así que nunca bloquean la resolución de una habitación.
- Puerta bloqueada: solo se desbloquea cuando todas las cajas están sobre sus zonas correspondientes.

## Juego continuo (5 habitaciones)

Las 5 habitaciones viven en **una sola escena** (`GameScene`), sin cortes entre pantallas. Cada habitación se construye **al lado** de la anterior (un offset de 840 px en X por habitación). Al entrar por la puerta abierta, la siguiente habitación ya está armada a la derecha y la cámara panea (`camera.pan`) hacia ella; al terminar el paneo se destruye la habitación anterior. Completar la quinta habitación lleva a la pantalla de Victoria.

- `src/game/levels.js` contiene la composición de cada habitación como datos puros (plataformas, piso, zonas, puerta, cajas, spawn, púas, láseres y patrullas de enemigos). Las coordenadas son relativas al origen de cada habitación.
- Al reintentar desde el Game Over, `GameScene` reconstruye solo la habitación alcanzada en el origen de la cámara.
- OJO con Phaser 4: el callback de `camera.pan()` corre en **cada frame**, no al terminar. Para limpiar la habitación anterior una sola vez hay que escuchar `PAN_COMPLETE`.

## Controles

| Acción | Control |
|---|---|
| Mover | Flechas ← → |
| Saltar | Espacio |
| Atacar | X |
| Subir caja | C |

## Arquitectura

`main.js` crea el juego (config de Phaser, fames de física arcade y registro de escenas). Cada escena vive en `src/game/scenes/` y comparte sistemas comunes:

```
Game
 ├── Scenes (Menu, Game, GameOver, Victory)
 ├── levels (composición de las 5 habitaciones)
 ├── Player (movimiento, salto, hitbox de ataque e invulnerabilidad)
 ├── Box (colores, push y resolución de colisiones entre cajas)
 ├── DoorSystem (puerta y zonas; onEnter para pasar de habitación)
 ├── SpikeSystem
 ├── LaserSystem
 ├── EnemySystem (centinelas con patrulla y muerte por ataque)
 ├── Lives (contador de 3 vidas + ventana de invulnerabilidad)
 ├── Timer (singleton)
 └── Hud (botón de reinicio + indicadores de vida y habitación)
```

## Agentes de OpenCode utilizados

- **opencode** (agente principal, modelo `big-pickle`): implementación de escenas, niveles, sistemas de púas/láseres, depuración y commits.
- **explore** (subagente): exploración del código y de la API interna de Phaser 4 para resolver incompatibilidades.

## Principales instrucciones o prompts empleados

- Explorar el proyecto y entender la base (arquitectura de escenas, estilos de niveles, físicas).
- Agregar los niveles 4 y 5 con un sistema de láseres y una paleta de cajas ampliada (verde y cian).
- Corregir que el juego no avanzaba del nivel 3 al 4 y al 5.
- Rediseñar los niveles 4 y 5 basándose en el patrón de serpiente de los niveles previos y dar más margen temporal a los láseres.

## Problemas encontrados y soluciones aplicadas

1. **Faltan APIs en Phaser 4**: `Phaser.Math.Min/Max` y el getter `Rectangle.center` no existen (a diferencia de Phaser 3) → se usaron `Math.min/max` y `centerX/centerY`.
2. **Victoria al terminar el nivel 3 en vez de pasar al 4/5**: el navegador/servidor servía un bundle viejo con `targetScene: 'Victory'` → se verificó el módulo que servía el dev server, se hizo hard refresh y se commiteó el estado correcto.
3. **Láseres sin margen para el jugador**: ventanas de activación muy cortas → aviso previo de 600 ms y tiempos activo/apagado ampliados (`onMs` 1800-2100 / `offMs` 1500).
4. **Plataformas "en escalera" en niveles 4 y 5**: se rediseñaron con el patrón serpiente/zigzag de los niveles 1-3.
5. **Errores de sistemas**: `SpikeSystem` requería la escena como argumento; el láser quedaba "anclado" en estado de aviso → `update` sin estado; cajas y púas reposicionadas para no superponerse.