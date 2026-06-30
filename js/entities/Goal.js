import * as THREE from 'three';
import { Entity } from './Entity.js';

export class Goal extends Entity {
  constructor(config = {}) {
    const scale = config.scale ?? new THREE.Vector3(1.8, 0.25, 1.8);
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(scale.x, scale.y, scale.z),
      new THREE.MeshStandardMaterial({ color: config.color ?? '#ff8c00' })
    );

    super({
      scale,
      mesh,
      position: config.position ?? new THREE.Vector3()
    });
  }
}
