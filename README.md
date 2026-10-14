### Nombre del juego

**ESCARABOX** — Puzzle-platformer 2D en pantalla portrait (840×960): empujá cajas de colores sobre las zonas de su mismo color para desbloquear la puerta y avanzar de nivel. Cuenta con 5 niveles, una sola vida y peligros como púas y láseres.

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

Puzzle de empuje de cajas: cada zona del suelo (o de una plataforma) debe recibir una caja del mismo color. Mientras no se completen todas las zonas, la puerta de salida permanece cerrada. El jugador tiene una sola vida: tocar una púa o un láser activo provoca Game Over, con opción de reintentar el nivel o volver al menú.

### Objetivo

Colocar cada caja sobre la zona de su mismo color para abrir la puerta y completar los 5 niveles consecutivos, que terminan en la pantalla de Victoria.

### Mecánicas principales

- Push de cajas: empujar (no arrastrar) con el cuerpo; las cajas se desplazan sobre las plataformas y pueden caer a niveles inferiores.
- 1 vida: púas y láseres activos (con previo aviso naranja) matan al instante → Game Over.
- Puerta bloqueada: solo se desbloquea cuando todas las cajas están sobre sus zonas correspondientes.

## Controles

| Acción | Control |
|---|---|
| Mover | Flechas ← → |
| Saltar | Espacio |

## Arquitectura

`main.js` crea el juego (config de Phaser, fames de física arcade y registro de escenas). Cada escena vive en `src/game/scenes/` y comparte sistemas comunes:

```
Game
 ├── Scenes (Menu, Level1..5, GameOver, Victory)
 ├── Player
 ├── Box (colores, push y resolución de colisiones entre cajas)
 ├── DoorSystem (puerta, zonas y transición de nivel)
 ├── SpikeSystem
 ├── LaserSystem
 ├── Timer (singleton)
 └── Hud (botón de reinicio)
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