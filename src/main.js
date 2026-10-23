import './style.css'
import Phaser from 'phaser'
import MenuScene from './game/scenes/MenuScene.js'
import GameScene from './game/scenes/GameScene.js'
import GameOverScene from './game/scenes/GameOverScene.js'
import VictoryScene from './game/scenes/VictoryScene.js'
import TopDownTestScene from './game/scenes/TopDownTestScene.js'

const config = {
  type: Phaser.AUTO,
  parent: 'app',
  width: 840,
  height: 960,
  backgroundColor: '#16171d',
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 900 },
      debug: false,
    },
  },
  scene: [MenuScene, GameScene, GameOverScene, VictoryScene, TopDownTestScene],
}

new Phaser.Game(config)