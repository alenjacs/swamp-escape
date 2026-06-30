import * as THREE from 'three';
import { DynamicEntity } from './DynamicEntity.js';

export class Player extends DynamicEntity {
  constructor(config = {}) {
    super({
      color: '#3b82f6',
      topSpeed: config.topSpeed ?? 8,
      maxForce: config.maxForce ?? 25,
      scale: new THREE.Vector3(1.2, 1.6, 1.2),
      ...config
    });

    this.maxHealth = config.maxHealth ?? 100;
    this.health = this.maxHealth;
    this.sprintMultiplier = config.sprintMultiplier ?? 1.45;
    this.baseTopSpeed = this.topSpeed;
    this.radius = config.radius ?? 0.7;
    this.isSprinting = false;
    this.sprintDuration = config.sprintDuration ?? 0.9;
    this.sprintCooldown = config.sprintCooldown ?? 2.0;
    this.sprintTimer = 0;
    this.cooldownTimer = 0;
  }

  startSprint() {
    if (this.cooldownTimer > 0 || this.sprintTimer > 0) return;
    this.sprintTimer = this.sprintDuration;
    this.isSprinting = true;
    this.topSpeed = this.baseTopSpeed * this.sprintMultiplier;
  }

  takeDamage(amount) {
    this.health = Math.max(0, this.health - amount);
  }

  healFull() {
    this.health = this.maxHealth;
  }

  update(deltaTime, map) {
    if (this.sprintTimer > 0) {
      this.sprintTimer -= deltaTime;
      if (this.sprintTimer <= 0) {
        this.sprintTimer = 0;
        this.isSprinting = false;
        this.topSpeed = this.baseTopSpeed;
        this.cooldownTimer = this.sprintCooldown;
      }
    }

    if (this.cooldownTimer > 0) {
      this.cooldownTimer = Math.max(0, this.cooldownTimer - deltaTime);
    }

    const previous = this.position.clone();
    super.update(deltaTime, map);

    const tile = map.quantize(this.position);
    if (!tile || !tile.isWalkable()) {
      this.position.copy(previous);
      this.mesh.position.copy(this.position);
      this.mesh.position.y += this.scale.y / 2;
      this.velocity.set(0, 0, 0);
    }
  }
}
