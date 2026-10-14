### Nombre del juego

**ESCARABOX** — Puzzle-platformer 2D en pantalla portrait (840×960): empujá cajas de colores sobre las zonas de su mismo color para desbloquear la puerta y subir. Los pisos 1 a 5 están hechos a mano; del piso 6 en adelante las habitaciones se generan al azar, así que la partida no tiene final. Una sola partida con 3 vidas y peligros como púas, láseres y enemigos centinela.

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

Puzzle de empuje de cajas: cada zona del suelo (o de una plataforma) debe recibir una caja del mismo color. Mientras no se completen todas las zonas, la puerta de salida permanece cerrada. El jugador tiene **3 vidas**: tocar una púa, un láser activo o un enemigo quita una vida y otorga 1,2 s de invulnerabilidad parpadeante. Al llegar a 0 vidas se muestra el Game Over, con opción de reintentar el nivel o volver al menú.

### Objetivo

Colocar cada caja sobre la zona de su mismo color para abrir la puerta y completar los 5 niveles consecutivos, que terminan en la pantalla de Victoria.

### Mecánicas principales

- Push de cajas: empujar (no arrastrar) con el cuerpo; las cajas se desplazan sobre las plataformas y pueden caer a niveles inferiores.
- 3 vidas **para toda la partida**: tocar una púa, un láser activo o un enemigo quita una vida y otorga 1,2 s de invulnerabilidad parpadeante. Al llegar a 0 vidas se muestra el Game Over con el piso alcanzado.
- Empujón vertical: con **C**, estando sobre el suelo y al lado de una caja, el jugador la levanta y sube con ella. Sube ~160 px por pulsación (un nivel de plataforma), así que una caja caída se recupera empujándola plataforma a plataforma. Si no hay caja al lado, la C no hace nada.
- Ataque cuerpo a cuerpo: con **X** el jugador ejecuta un tajo corto hacia el lado al que mira. Dura ~130 ms con 320 ms de recarga.
- Enemigos centinela: patrullan un tramo fijo de plataforma y se los elimina de un solo golpe. No empujan cajas, así que nunca bloquean la resolución de una habitación.
- Puerta bloqueada: solo se desbloquea cuando todas las cajas están sobre sus zonas correspondientes.

## Modo roguelite

Los pisos **1 a 5** son los niveles hechos a mano, con su puerta y su cambio de escena. Al superar el piso 5 el juego entra en modo infinito, y ahí **ya no hay puertas ni transiciones**: todo ocurre en una sola escena. Cuando ponés las cajas en sus zonas aparece un **ascensor**; al pisarlo se genera la habitación siguiente 960 px más arriba y la cámara se desplaza hacia ella. No hay pantalla de victoria; la partida termina cuando te quedás sin vidas.

La dificultad crece con el piso y tiene topes:

| Pisos | Cajas | Enemigos | Púas | Láseres |
|---|---|---|---|---|
| 6–15 | 2 | 1 | 1 | 0–1 |
| 16–25 | 3 | 2–3 | 2 | 1–2 |
| 26+ | 4–5 | 3–4 | 3 | 3 |

**Regla del generador:** una zona siempre tiene una caja que puede alcanzarla. Las cajas nacen en plataformas altas y caen de nivel hasta el piso, así que empujarlas por el piso siempre las lleva a su zona. Las púas y los centinelas se colocan solo en el hueco libre de cada plataforma, nunca encima de una caja, una zona ni del punto de aparición.

Para verificar el generador después de tocarlo:

```
node scripts/verify-rooms.js
```

Genera 4600 habitaciones y valida las reglas de solubilidad (cajas apoyadas, una caja y una zona por color, zonas separadas, peligros que no tapan zonas ni el spawn, láseres que no cortan plataformas).

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
 ├── Scenes (Menu, Level1..5, Room, GameOver, Victory)
 ├── Player (movimiento, salto, hitbox de ataque e invulnerabilidad)
 ├── Box (colores, push y resolución de colisiones entre cajas)
 ├── DoorSystem (puerta, zonas y transición)
 ├── SpikeSystem
 ├── LaserSystem
 ├── EnemySystem (centinelas con patrulla y muerte por ataque)
 ├── RoomGenerator (habitaciones procedurales del piso 6 en adelante)
 ├── Lives (contador de 3 vidas + ventana de invulnerabilidad)
 ├── Timer (singleton)
 └── Hud (botón de reinicio + indicadores de vida y piso)
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