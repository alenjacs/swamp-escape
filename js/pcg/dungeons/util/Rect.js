import * as THREE from 'three';

// A simple rectangle
export class Rect {
  
  // x, y is top left hand corner
  // w, h is width and height
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
  }

  // the center of our rectangle
  getCenter() {
    return new THREE.Vector2(
      Math.floor(this.x + this.w/2),
      Math.floor(this.y + this.h/2)
    );
  }
}
