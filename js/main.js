import { World } from './World.js';

const world = new World();
world.init();

function onResize() {
  world.camera.aspect = window.innerWidth / window.innerHeight;
  world.camera.updateProjectionMatrix();
  world.renderer.setSize(window.innerWidth, window.innerHeight);
}

window.addEventListener('resize', onResize);
onResize();

function loop() {
  requestAnimationFrame(loop);
  world.update();
  world.render();
}

loop();