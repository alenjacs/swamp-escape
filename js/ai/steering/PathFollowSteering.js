import * as THREE from 'three';
import { SteeringBehaviours } from './SteeringBehaviours.js';

export class PathFollowSteering {
  static simple(entity) {
    if (!entity.pathFollower || !entity.pathFollower.path) {
      return new THREE.Vector3();
    }

    const path = entity.pathFollower.path;
    const currentIndex = entity.pathFollower.index;

    if (currentIndex >= path.size()) {
      return new THREE.Vector3();
    }

    const currentPoint = path.get(currentIndex);
    const distance = entity.position.distanceTo(currentPoint);

    if (distance < 0.5 && currentIndex < path.size() - 1) {
      entity.pathFollower.index++;
    }

    if (entity.pathFollower.index >= path.size() - 1) {
      return SteeringBehaviours.arrive(entity, path.get(path.size() - 1));
    }

    return SteeringBehaviours.seek(entity, path.get(entity.pathFollower.index));
  }

  static reynolds(entity, pathOffset = 0.35, futureDistance = 1.2, debug = null) {
    if (!entity.pathFollower || !entity.pathFollower.path) {
      return new THREE.Vector3();
    }

    const path = entity.pathFollower.path;
    if (path.size() === 0) {
      return new THREE.Vector3();
    }

    let velocityDir = entity.velocity.clone();
    if (velocityDir.lengthSq() === 0) {
      if (entity.pathFollower.index < path.size()) {
        velocityDir = path
          .get(entity.pathFollower.index)
          .clone()
          .sub(entity.position);
      }
    }

    if (velocityDir.lengthSq() === 0) {
      return new THREE.Vector3();
    }

    velocityDir.normalize();

    const futurePos = entity.position
      .clone()
      .add(velocityDir.multiplyScalar(futureDistance));

    let bestPoint = null;
    let bestDistSq = Infinity;
    let bestSegmentIndex = 0;

    for (let i = 0; i < path.size() - 1; i++) {
      const a = path.get(i);
      const b = path.get(i + 1);

      const ab = b.clone().sub(a);
      const af = futurePos.clone().sub(a);

      const abLenSq = ab.lengthSq();
      if (abLenSq === 0) continue;

      let t = af.dot(ab) / abLenSq;
      t = Math.max(0, Math.min(1, t));

      const projection = a.clone().add(ab.multiplyScalar(t));
      const distSq = projection.distanceToSquared(futurePos);

      if (distSq < bestDistSq) {
        bestDistSq = distSq;
        bestPoint = projection;
        bestSegmentIndex = i;
      }
    }

    if (!bestPoint) {
      return new THREE.Vector3();
    }

    if (debug && debug.updatePositions) {
      debug.updatePositions({
        futurePos,
        normalPoint: bestPoint
      });
    }

    const distanceFromPath = Math.sqrt(bestDistSq);

    const segmentStart = path.get(bestSegmentIndex);
    const segmentEnd = path.get(bestSegmentIndex + 1);
    const segmentDir = segmentEnd.clone().sub(segmentStart).normalize();

    const target = bestPoint.clone().add(segmentDir.multiplyScalar(pathOffset));

    if (distanceFromPath > path.radius) {
      return SteeringBehaviours.seek(entity, target);
    }

    if (entity.pathFollower.index < path.size() - 1) {
      const nextPoint = path.get(entity.pathFollower.index);
      if (entity.position.distanceTo(nextPoint) < 0.75) {
        entity.pathFollower.index++;
      }
    }

    if (entity.pathFollower.index >= path.size() - 1) {
      return SteeringBehaviours.arrive(entity, path.get(path.size() - 1));
    }

    return SteeringBehaviours.seek(entity, target);
  }
}