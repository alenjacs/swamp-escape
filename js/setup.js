import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

function makeSkyCanvas(width = 1024, height = 1024) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function makeGradient(ctx, canvas, topColor, bottomColor) {
  const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
  gradient.addColorStop(0, topColor);
  gradient.addColorStop(1, bottomColor);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawCloud(ctx, x, y, scale = 1) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scale, scale);

  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.beginPath();
  ctx.arc(-42, 8, 28, 0, Math.PI * 2);
  ctx.arc(-10, -8, 36, 0, Math.PI * 2);
  ctx.arc(30, 4, 30, 0, Math.PI * 2);
  ctx.arc(62, 14, 22, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.fillRect(-55, 8, 125, 34);
  ctx.restore();
}

function drawStar(ctx, x, y, radius, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  if (radius >= 2) {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x - radius * 2.4, y);
    ctx.lineTo(x + radius * 2.4, y);
    ctx.moveTo(x, y - radius * 2.4);
    ctx.lineTo(x, y + radius * 2.4);
    ctx.stroke();
  }

  ctx.restore();
}

export function createSkyBackground(mode = 'day') {
  const canvas = makeSkyCanvas();
  const ctx = canvas.getContext('2d');

  if (mode === 'night') {
    makeGradient(ctx, canvas, '#06152f', '#12315c');

    for (let i = 0; i < 90; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const radius = Math.random() < 0.12 ? 2.1 : 1.1;
      const alpha = 0.55 + Math.random() * 0.45;
      drawStar(ctx, x, y, radius, alpha);
    }
  } else {
    makeGradient(ctx, canvas, '#9ed8ff', '#dff4ff');

    drawCloud(ctx, 170, 175, 1.15);
    drawCloud(ctx, 470, 255, 0.95);
    drawCloud(ctx, 790, 150, 1.05);
    drawCloud(ctx, 860, 345, 0.82);
    drawCloud(ctx, 300, 395, 0.76);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

// Creates and returns the scene
export function createScene() {
  const scene = new THREE.Scene();
  scene.background = createSkyBackground('day');
  return scene;
}

// Creates and returns the camera
export function createCamera() {
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  );

  camera.position.set(0, 95, 55);
  camera.lookAt(0, 0, 0);
  return camera;
}

// Creates and returns the renderer
export function createRenderer() {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);

  renderer.domElement.style.display = 'block';
  renderer.domElement.style.width = '100vw';
  renderer.domElement.style.height = '100vh';

  document.body.style.margin = '0';
  document.body.style.overflow = 'hidden';
  document.body.appendChild(renderer.domElement);

  return renderer;
}

// Creates light and adds it to the scene
export function createLight(scene) {
  const ambient = new THREE.AmbientLight(0xffffff, 1.25);
  scene.add(ambient);

  const sun = new THREE.DirectionalLight(0xffffff, 1.8);
  sun.position.set(30, 60, 20);
  scene.add(sun);
}

// Shows axesHelper, gridHelper, and OrbitControls
export function showHelpers(scene, camera, renderer, levelMap) {
  const orbitControls = new OrbitControls(camera, renderer.domElement);
  orbitControls.target.set(0, 0, 0);
  orbitControls.update();
}