import * as THREE from 'three';

// Namespace for group steering behaviours
export class GroupSteeringBehaviours {
  static separate(entity, others, radius) {
    let count = 0;
    let steer = new THREE.Vector3();

    for (let other of others) {
      if (other === entity) continue;

      let offset = entity.position.clone().sub(other.position);
      let distance = offset.length();

      if (distance > 0 && distance < radius) {
        offset.setLength(1 / distance);
        steer.add(offset);
        count++;
      }
    }

    if (count > 0) {
      steer.divideScalar(count);
      steer.setLength(entity.topSpeed);
      steer.sub(entity.velocity);
    }

    return steer;
  }
}