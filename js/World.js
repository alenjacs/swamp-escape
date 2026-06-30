import * as THREE from 'three';
import * as Setup from './setup.js';

import { InputHandler } from './input/InputHandler.js';
import { TileMap } from './maps/TileMap.js';
import { Path } from './maps/Path.js';
import { TileMapRenderer } from './renderers/TileMapRenderer.js';

import { GameConfig } from './config/GameConfig.js';
import { Hud } from './ui/Hud.js';

import { Player } from './entities/Player.js';
import { Guard } from './entities/Guard.js';
import { Goal } from './entities/Goal.js';

import { SwampGenerator } from './pcg/SwampGenerator.js';

import { JPS } from './ai/pathfinding/JPS.js';
import { GroupSteeringBehaviours } from './ai/steering/GroupSteeringBehaviours.js';
import { PathFollowSteering } from './ai/steering/PathFollowSteering.js';
import { Tile } from './maps/Tile.js';

export class World {
  constructor() {
    this.scene = Setup.createScene();
    this.camera = Setup.createCamera();
    this.renderer = Setup.createRenderer();
    this.clock = new THREE.Clock();

    this.inputHandler = new InputHandler(this.camera);
    this.hud = new Hud();

    this.entities = [];
    this.guards = [];

    this.player = null;
    this.goal = null;

    this.gameState = 'playing';
    this.restartRequested = false;
    this.shiftHeld = false;
    this.skyMode = 'day';

    this.applySkyBackground();

    this.renderer.domElement.addEventListener('click', () => {
      this.toggleSkyMode();
    });

    this.pathDebug = {
      updatePositions() {}
    };

    this.guardTuning = {
      sightRange: 8.0,
      sprintPathRange: 4.0,
      sprintPathWidth: 1.1,
      sprintPathBehindAllowance: 1.2,
      sprintPathAhead: 5.0,
      scoutRadiusMin: 2,
      scoutRadiusMax: 5,
      spawnCountMin: 6,
      spawnCountMax: 10,
      minSpawnTileSeparation: 7,
      stuckDistanceEpsilon: 0.05,
      stuckSeconds: 0.45,
      collisionPadding: 0.04,
      searchDuration: 2.2
    };

    this.playerTuning = {
      collisionPadding: 0.05,
      obstacleStunSeconds: 1.0,
      walkSpeedMultiplier: 0.92,
      sprintMultiplier: 2.45
    };

    this.terrainTuning = {
      waterSlowMultiplier: 0.85
    };

    this.damageTuning = {
      obstacleDamage: 10,
      enemyDamage: 50,
      enemyHitCooldown: 0.6
    };

    window.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();

      if (key === 'shift') {
        this.shiftHeld = true;
      }

      if (key === 'r') {
        this.restartRequested = true;
      }
    });

    window.addEventListener('keyup', (e) => {
      const key = e.key.toLowerCase();

      if (key === 'shift') {
        this.shiftHeld = false;
      }
    });
  }

  applySkyBackground() {
    if (!this.scene) return;
    this.scene.background = Setup.createSkyBackground(this.skyMode);
  }

  toggleSkyMode() {
    this.skyMode = this.skyMode === 'day' ? 'night' : 'day';
    this.applySkyBackground();
  }

  init() {
    // Reset runtime state so restart always rebuilds a fresh procedural run.
    this.entities = [];
    this.guards = [];
    this.player = null;
    this.goal = null;
    this.gameState = 'playing';

    this.scene.clear();

    this.map = new TileMap(GameConfig.map.tileSize, {
      width: GameConfig.map.width,
      depth: GameConfig.map.depth
    });

    this.generateSwampMap();

    Setup.createLight(this.scene);
    Setup.showHelpers(this.scene, this.camera, this.renderer, this.map);

    this.tileMapRenderer = new TileMapRenderer(this.map);
    this.tileMapRenderer.render(this.scene);

    this.paintSpecialTiles();

    this.setupPathfinder();
    this.spawnPlayer();
    this.spawnGoal();
    this.spawnGuards();

    this.updateHud();
  }

  generateSwampMap() {
    // SwampGenerator handles the procedural content generation for the map layout.
    const generated = SwampGenerator.generate(this.map, {
      obstacleThreshold: GameConfig.map.obstacleThreshold,
      noiseScale: GameConfig.map.noiseScale,
      octaves: GameConfig.map.octaves,
      persistence: GameConfig.map.persistence,
      lacunarity: GameConfig.map.lacunarity,
      clearRadius: GameConfig.map.clearRadius
    });

    this.map.grid = generated.grid;
    this.map.walkableTiles = this.map.grid.flat().filter((tile) => tile.isWalkable());

    this.startTile = this.map.grid[generated.startRow][generated.startCol];
    this.goalTile = this.map.grid[generated.goalRow][generated.goalCol];
  }

  paintSpecialTiles() {
    if (!this.tileMapRenderer) return;

    this.tileMapRenderer.setTileColor(this.startTile, new THREE.Color('#22c55e'));
    this.tileMapRenderer.setTileColor(this.goalTile, new THREE.Color('#ff8c00'));
  }

  setupPathfinder() {
    // JPS is used for guard pathfinding on a uniform-cost walkable/blocked grid.
    this.heuristic = (a, b) => {
      return Math.abs(a.row - b.row) + Math.abs(a.col - b.col);
    };

    this.pathfinder = new JPS(this.map, this.heuristic, this.tileMapRenderer);
  }

  spawnPlayer() {
    const startPos = this.map.localize(this.startTile);

    const walkSpeed = GameConfig.player.topSpeed * this.playerTuning.walkSpeedMultiplier;

    this.player = new Player({
      position: startPos,
      topSpeed: walkSpeed,
      maxHealth: 100,
      sprintMultiplier: this.playerTuning.sprintMultiplier,
      sprintCooldown: 0,
      sprintDuration: 0,
      radius: GameConfig.player.radius
    });

    this.player.baseTopSpeed = walkSpeed;
    this.player.topSpeed = walkSpeed;
    this.player.sprintMultiplier = this.playerTuning.sprintMultiplier;
    this.player.sprintCooldown = 0;
    this.player.sprintDuration = 0;
    this.player.sprintTimer = 0;
    this.player.cooldownTimer = 0;
    this.player.health = 100;
    this.player.maxHealth = 100;
    this.player.enemyHitCooldownTimer = 0;
    this.player.wasTouchingObstacle = false;
    this.player.touchingObstacleNow = false;
    this.player.stunTimer = 0;
    this.player.isSprinting = false;
    this.player.isInWater = false;

    this.addEntityToWorld(this.player);
  }

  spawnGoal() {
    const goalPos = this.map.localize(this.goalTile);

    this.goal = new Goal({
      position: goalPos,
      color: GameConfig.goal.color
    });

    this.scene.add(this.goal.mesh);
  }

  spawnGuards() {
    // Guards are spawned with short patrol routes so the FSM has visible patrol behaviour immediately.
    const targetCount = THREE.MathUtils.randInt(
      this.guardTuning.spawnCountMin,
      this.guardTuning.spawnCountMax
    );

    const plannedGuards = [];
    let attempts = 0;
    const maxAttempts = 250;

    while (plannedGuards.length < targetCount && attempts < maxAttempts) {
      attempts++;

      const patrolTile = this.getRandomGuardSpawnTile();
      if (!patrolTile) continue;

      const patrolRoute = this.createScoutRoute(patrolTile);
      if (!patrolRoute || patrolRoute.length === 0) continue;

      if (this.isGuardSpawnTooCrowded(patrolTile, plannedGuards)) continue;
      if (this.routeCrossesAnyExistingRoute(patrolTile, patrolRoute, plannedGuards)) continue;

      plannedGuards.push({ patrolTile, patrolRoute });
    }

    for (const plan of plannedGuards) {
      const patrolPos = this.map.localize(plan.patrolTile);

      const guard = new Guard({
        position: patrolPos,
        topSpeed: GameConfig.guard.patrolSpeed,
        maxForce: GameConfig.guard.maxForce,
        pathRecalcSeconds: GameConfig.guard.pathRecalcSeconds,
        searchDuration: this.guardTuning.searchDuration
      });

      guard.patrolTile = plan.patrolTile;
      guard.patrolRoute = plan.patrolRoute;
      guard.patrolIndex = 0;

      guard.pathFollower = null;
      guard.pathTargetTile = null;
      guard.pathTargetPosition = null;

      guard.stuckTimer = 0;
      guard.lastPositionForStuck = guard.position.clone();
      guard.lastSeenPlayerPosition = null;
      guard.lockedChase = false;
      guard.isInWater = false;
      guard.searchTimer = 0;
      guard.searchDuration = this.guardTuning.searchDuration;
      guard.returnTargetTile = guard.patrolRoute[guard.patrolIndex] ?? null;

      this.guards.push(guard);
      this.addEntityToWorld(guard);

      if (guard.patrolRoute.length > 0) {
        this.assignPathToTile(guard, guard.patrolRoute[guard.patrolIndex]);
      }
    }
  }

  createScoutRoute(centerTile) {
    const tryAxes = Math.random() < 0.5
      ? [
          [0, -1, 0, 1],
          [-1, 0, 1, 0]
        ]
      : [
          [-1, 0, 1, 0],
          [0, -1, 0, 1]
        ];

    for (const [dr1, dc1, dr2, dc2] of tryAxes) {
      const a = this.findScoutEndpoint(centerTile, dr1, dc1);
      const b = this.findScoutEndpoint(centerTile, dr2, dc2);

      const unique = [];

      if (a && a !== centerTile) unique.push(a);
      if (b && b !== centerTile && b !== a) unique.push(b);

      if (unique.length >= 2) return unique;
    }

    for (let i = 0; i < 50; i++) {
      const fallback = this.map.getRandomWalkableTile();
      if (fallback && fallback !== centerTile) {
        return [fallback, centerTile];
      }
    }

    return [centerTile];
  }

  findScoutEndpoint(centerTile, dr, dc) {
    let best = centerTile;
    const maxSteps = this.guardTuning.scoutRadiusMax;
    const minSteps = this.guardTuning.scoutRadiusMin;

    for (let step = 1; step <= maxSteps; step++) {
      const row = centerTile.row + dr * step;
      const col = centerTile.col + dc * step;

      if (!this.map.isInGrid(row, col)) break;

      const tile = this.map.getTile(row, col);
      if (!tile || !tile.isWalkable()) break;

      best = tile;
    }

    const distance =
      Math.abs(best.row - centerTile.row) + Math.abs(best.col - centerTile.col);

    if (distance < minSteps) return centerTile;
    return best;
  }

  getRandomGuardSpawnTile() {
    for (let i = 0; i < 200; i++) {
      const tile = this.map.getRandomWalkableTile();

      const farFromStart =
        Math.abs(tile.row - this.startTile.row) + Math.abs(tile.col - this.startTile.col) > 10;

      const farFromGoal =
        Math.abs(tile.row - this.goalTile.row) + Math.abs(tile.col - this.goalTile.col) > 6;

      if (farFromStart && farFromGoal) return tile;
    }

    return this.map.getRandomWalkableTile();
  }

  isGuardSpawnTooCrowded(tile, plannedGuards) {
    return plannedGuards.some((plan) => {
      const distance =
        Math.abs(tile.row - plan.patrolTile.row) +
        Math.abs(tile.col - plan.patrolTile.col);

      return distance < this.guardTuning.minSpawnTileSeparation;
    });
  }

  getRouteSegments(centerTile, patrolRoute) {
    const routeTiles = [centerTile, ...patrolRoute, centerTile];
    const segments = [];

    for (let i = 0; i < routeTiles.length - 1; i++) {
      const a = this.map.localize(routeTiles[i]);
      const b = this.map.localize(routeTiles[i + 1]);
      segments.push([a, b]);
    }

    return segments;
  }

  orientation(a, b, c) {
    const value =
      (b.z - a.z) * (c.x - b.x) -
      (b.x - a.x) * (c.z - b.z);

    if (Math.abs(value) < 0.0001) return 0;
    return value > 0 ? 1 : 2;
  }

  onSegment(a, b, c) {
    return (
      b.x <= Math.max(a.x, c.x) + 0.0001 &&
      b.x >= Math.min(a.x, c.x) - 0.0001 &&
      b.z <= Math.max(a.z, c.z) + 0.0001 &&
      b.z >= Math.min(a.z, c.z) - 0.0001
    );
  }

  segmentsIntersect(a1, a2, b1, b2) {
    const o1 = this.orientation(a1, a2, b1);
    const o2 = this.orientation(a1, a2, b2);
    const o3 = this.orientation(b1, b2, a1);
    const o4 = this.orientation(b1, b2, a2);

    if (o1 !== o2 && o3 !== o4) return true;

    if (o1 === 0 && this.onSegment(a1, b1, a2)) return true;
    if (o2 === 0 && this.onSegment(a1, b2, a2)) return true;
    if (o3 === 0 && this.onSegment(b1, a1, b2)) return true;
    if (o4 === 0 && this.onSegment(b1, a2, b2)) return true;

    return false;
  }

  routeCrossesAnyExistingRoute(centerTile, patrolRoute, plannedGuards) {
    const newSegments = this.getRouteSegments(centerTile, patrolRoute);

    for (const plan of plannedGuards) {
      const existingSegments = this.getRouteSegments(plan.patrolTile, plan.patrolRoute);

      for (const [a1, a2] of newSegments) {
        for (const [b1, b2] of existingSegments) {
          const sharesEndpoint =
            a1.distanceTo(b1) < 0.001 ||
            a1.distanceTo(b2) < 0.001 ||
            a2.distanceTo(b1) < 0.001 ||
            a2.distanceTo(b2) < 0.001;

          if (sharesEndpoint) continue;

          if (this.segmentsIntersect(a1, a2, b1, b2)) {
            return true;
          }
        }
      }
    }

    return false;
  }

  addEntityToWorld(entity) {
    this.entities.push(entity);
    if (entity.mesh) {
      this.scene.add(entity.mesh);
    }
  }

  safeQuantize(position) {
    const row = Math.floor((position.z - this.map.minZ) / this.map.tileSize);
    const col = Math.floor((position.x - this.map.minX) / this.map.tileSize);

    if (!this.map.isInGrid(row, col)) return null;
    return this.map.getTile(row, col);
  }

  isWaterTile(tile) {
    return !!tile && tile.type === Tile.Type.Water;
  }

  getWaterSlowMultiplierForPosition(position) {
    // Water remains walkable for JPS, but locally slows movement speed for gameplay.
    const tile = this.safeQuantize(position);
    return this.isWaterTile(tile) ? this.terrainTuning.waterSlowMultiplier : 1.0;
  }

  assignPathToTile(guard, targetTile) {
    // Convert a grid path into world-space points so guards can use Reynolds path following.
    const startTile = this.safeQuantize(guard.position);
    if (!startTile || !targetTile || !targetTile.isWalkable()) return false;

    const tilePath = this.pathfinder.findPath(startTile, targetTile);
    if (!tilePath || tilePath.length === 0) return false;

    const worldPoints = tilePath.map((tile) => this.map.localize(tile));
    const path = new Path({
      points: worldPoints,
      radius: 1.0
    });

    guard.pathFollower = {
      path,
      index: path.size() > 1 ? 1 : 0
    };
    guard.pathTargetTile = targetTile;
    guard.pathTargetPosition = this.map.localize(targetTile);

    return true;
  }

  assignPathToPosition(guard, targetPosition) {
    // Quantize a world target to the navigation grid, then build a world-space path from JPS.
    const startTile = this.safeQuantize(guard.position);
    const targetTile = this.safeQuantize(targetPosition);

    if (!startTile || !targetTile || !targetTile.isWalkable()) return false;

    const tilePath = this.pathfinder.findPath(startTile, targetTile);
    if (!tilePath || tilePath.length === 0) return false;

    const worldPoints = tilePath.map((tile) => this.map.localize(tile));
    const path = new Path({
      points: worldPoints,
      radius: 1.0
    });

    guard.pathFollower = {
      path,
      index: path.size() > 1 ? 1 : 0
    };
    guard.pathTargetTile = targetTile;
    guard.pathTargetPosition = targetPosition.clone();

    return true;
  }

  hasLineOfSight(fromPosition, toPosition) {
    // Line of sight is blocked by non-walkable obstacle tiles.
    const delta = toPosition.clone().sub(fromPosition);
    const distance = delta.length();

    if (distance <= 0.0001) return true;

    const dir = delta.normalize();
    const stepSize = this.map.tileSize * 0.35;
    const steps = Math.ceil(distance / stepSize);

    for (let i = 1; i < steps; i++) {
      const sample = fromPosition.clone().addScaledVector(dir, i * stepSize);
      const tile = this.safeQuantize(sample);

      if (!tile) return false;
      if (!tile.isWalkable()) return false;
    }

    return true;
  }

  hasReachedTile(position, tile, threshold = 0.45) {
    if (!tile) return false;
    const tilePos = this.map.localize(tile);
    return position.distanceTo(tilePos) <= threshold;
  }

  advancePatrolRoute(guard) {
    if (!guard.patrolRoute || guard.patrolRoute.length === 0) return;

    guard.patrolIndex = (guard.patrolIndex + 1) % guard.patrolRoute.length;
    const nextTile = guard.patrolRoute[guard.patrolIndex];

    if (nextTile) {
      this.assignPathToTile(guard, nextTile);
    }
  }

  damagePlayer(amount) {
    if (!this.player || this.gameState !== 'playing') return;

    this.player.health = Math.max(0, this.player.health - amount);

    if (this.player.health <= 0) {
      this.gameState = 'lose';
    }
  }

  syncEntityMeshPosition(entity) {
    if (!entity.mesh) return;
    entity.mesh.position.copy(entity.position);

    if (entity.scale && typeof entity.scale.y === 'number') {
      entity.mesh.position.y += entity.scale.y / 2;
    }
  }

  clampEntityInsideMap(entity, padding = 0.55) {
    const before = entity.position.clone();
    this.map.clampPosition(entity.position, padding);

    const hitEdge =
      Math.abs(before.x - entity.position.x) > 0.0001 ||
      Math.abs(before.z - entity.position.z) > 0.0001;

    if (hitEdge) {
      entity.velocity.set(0, 0, 0);
      this.syncEntityMeshPosition(entity);
    }
  }

  resolveCircleVsBlockedTiles(position, radius, padding = 0.04) {
    const corrected = position.clone();
    let collided = false;

    for (let pass = 0; pass < 3; pass++) {
      const centerTile = this.safeQuantize(corrected);
      if (!centerTile) break;

      let passCollided = false;

      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const row = centerTile.row + dr;
          const col = centerTile.col + dc;

          if (!this.map.isInGrid(row, col)) continue;

          const tile = this.map.getTile(row, col);
          if (!tile || tile.isWalkable()) continue;

          const minX = this.map.minX + col * this.map.tileSize;
          const maxX = minX + this.map.tileSize;
          const minZ = this.map.minZ + row * this.map.tileSize;
          const maxZ = minZ + this.map.tileSize;

          const closestX = THREE.MathUtils.clamp(corrected.x, minX, maxX);
          const closestZ = THREE.MathUtils.clamp(corrected.z, minZ, maxZ);

          let dx = corrected.x - closestX;
          let dz = corrected.z - closestZ;

          const rr = radius + padding;
          const distSq = dx * dx + dz * dz;

          if (distSq >= rr * rr) continue;

          collided = true;
          passCollided = true;

          if (distSq > 0.000001) {
            const dist = Math.sqrt(distSq);
            const push = rr - dist;
            corrected.x += (dx / dist) * push;
            corrected.z += (dz / dist) * push;
          } else {
            const leftPen = Math.abs(corrected.x - minX);
            const rightPen = Math.abs(maxX - corrected.x);
            const topPen = Math.abs(corrected.z - minZ);
            const bottomPen = Math.abs(maxZ - corrected.z);

            const minPen = Math.min(leftPen, rightPen, topPen, bottomPen);

            if (minPen === leftPen) corrected.x = minX - rr;
            else if (minPen === rightPen) corrected.x = maxX + rr;
            else if (minPen === topPen) corrected.z = minZ - rr;
            else corrected.z = maxZ + rr;
          }
        }
      }

      if (!passCollided) break;
    }

    return {
      position: corrected,
      collided
    };
  }

  resolveEntityObstacleCollision(entity, radius, padding = 0.04) {
    const result = this.resolveCircleVsBlockedTiles(entity.position, radius, padding);

    if (result.collided) {
      entity.position.copy(result.position);
      entity.velocity.set(0, 0, 0);
      this.syncEntityMeshPosition(entity);
    }

    return result.collided;
  }

  updatePlayer(dt) {
    // Player movement supports hold-to-sprint, but sprint is disabled while in water.
    if (!this.player) return;

    this.player.stunTimer = Math.max(0, (this.player.stunTimer ?? 0) - dt);

    if (this.player.stunTimer > 0) {
      this.player.isSprinting = false;
      this.player.isInWater = this.isWaterTile(this.safeQuantize(this.player.position));
      this.player.topSpeed = this.player.baseTopSpeed;
      this.player.velocity.set(0, 0, 0);
      return;
    }

    const playerTile = this.safeQuantize(this.player.position);
    const inWater = this.isWaterTile(playerTile);

    this.player.isInWater = inWater;

    if (inWater) {
      // Water slows down the player without changing the underlying pathfinding grid cost.
      this.player.isSprinting = false;
      this.player.topSpeed = this.player.baseTopSpeed * this.terrainTuning.waterSlowMultiplier;
    } else {
      this.player.isSprinting = this.shiftHeld;
      this.player.topSpeed = this.player.isSprinting
        ? this.player.baseTopSpeed * this.player.sprintMultiplier
        : this.player.baseTopSpeed;
    }

    const moveForce = this.inputHandler.getForce(this.player.maxForce);
    this.player.applyForce(moveForce);

    if (moveForce.lengthSq() === 0) {
      this.player.velocity.set(0, 0, 0);
    }
  }

  guardForwardVector(guard) {
    const forward = guard.velocity.clone();

    if (forward.lengthSq() > 0.0001) {
      return forward.normalize();
    }

    if (guard.pathFollower && guard.pathFollower.path && guard.pathFollower.path.size() > 0) {
      const idx = Math.min(guard.pathFollower.index ?? 0, guard.pathFollower.path.size() - 1);
      const target = guard.pathFollower.path.get(idx);
      const toTarget = target.clone().sub(guard.position);
      if (toTarget.lengthSq() > 0.0001) {
        return toTarget.normalize();
      }
    }

    return new THREE.Vector3(0, 0, 1);
  }

  isPlayerSprintingInGuardPath(guard) {
    if (!this.player?.isSprinting) return false;

    const toPlayer = this.player.position.clone().sub(guard.position);
    const distance = toPlayer.length();

    if (distance > this.guardTuning.sprintPathRange || distance <= 0.0001) {
      return false;
    }

    const forward = this.guardForwardVector(guard);

    const along = toPlayer.dot(forward);
    if (along < -this.guardTuning.sprintPathBehindAllowance) return false;
    if (along > this.guardTuning.sprintPathAhead) return false;

    const lateralVector = toPlayer.clone().sub(forward.clone().multiplyScalar(along));
    const lateralDistance = lateralVector.length();

    return lateralDistance <= this.guardTuning.sprintPathWidth;
  }

  canGuardSeePlayer(guard) {
    const distanceToPlayer = guard.position.distanceTo(this.player.position);

    const coneTip = guard.position.clone();
    coneTip.y = this.player.position.y;

    return (
      distanceToPlayer <= this.guardTuning.sightRange &&
      this.hasLineOfSight(coneTip, this.player.position)
    );
  }

  isGuardState(guard, state) {
    return guard.state === state;
  }

  transitionGuardState(guard, nextState) {
    if (guard.state === nextState) return false;
    guard.setState(nextState);
    return true;
  }

  enterGuardPatrol(guard) {
    // Patrol state: follow the current patrol route tile.
    this.transitionGuardState(guard, Guard.States.PATROL);
    guard.lockedChase = false;
    guard.searchTimer = 0;
    guard.pathTimer = 0;
    guard.returnTargetTile = guard.patrolRoute?.[guard.patrolIndex] ?? guard.patrolTile ?? null;

    if (guard.returnTargetTile) {
      this.assignPathToTile(guard, guard.returnTargetTile);
    }
  }

  enterGuardChase(guard) {
    // Chase state: lock onto the player's current position and recalculate often.
    this.transitionGuardState(guard, Guard.States.CHASE);
    guard.pathTimer = 0;
    guard.lockedChase = true;
    guard.searchTimer = 0;
    guard.lastSeenPlayerPosition = this.player.position.clone();
  }

  enterGuardSearch(guard) {
    // Search state: investigate  player's last seen position for a short time.
    if (!guard.lastSeenPlayerPosition) return;

    this.transitionGuardState(guard, Guard.States.SEARCH);
    guard.lockedChase = false;
    guard.searchTimer = guard.searchDuration ?? this.guardTuning.searchDuration;
    guard.pathTimer = 0;
    this.assignPathToPosition(guard, guard.lastSeenPlayerPosition);
  }

  enterGuardReturn(guard) {
    // Return state: move back to  patrol route after search expires.
    this.transitionGuardState(guard, Guard.States.RETURN);
    guard.lockedChase = false;
    guard.searchTimer = 0;
    guard.pathTimer = 0;

    const returnTile = guard.patrolRoute?.[guard.patrolIndex] ?? guard.patrolTile ?? null;
    guard.returnTargetTile = returnTile;

    if (returnTile) {
      this.assignPathToTile(guard, returnTile);
    }
  }

  updateGuardPerception(guard) {
    const hasDirectSight = this.canGuardSeePlayer(guard);
    const sprintPathTrigger = this.isPlayerSprintingInGuardPath(guard);
    const canSeeOrHearSprint = hasDirectSight || sprintPathTrigger;
    const distanceToPlayer = guard.position.distanceTo(this.player.position);

    // Explicit FSM transitions:
    // Patrol -> Chase, Return -> Chase, or Search -> Chase when the guard detects the player.
    if (canSeeOrHearSprint) {
      this.enterGuardChase(guard);
    // Chase -> Search when the guard loses the player after a confirmed sighting.
    } else if (this.isGuardState(guard, Guard.States.CHASE) && guard.lastSeenPlayerPosition) {
      this.enterGuardSearch(guard);
    // Search -> Return once the guard has finished investigating the last seen position.
    } else if (this.isGuardState(guard, Guard.States.SEARCH) && guard.searchTimer <= 0) {
      this.enterGuardReturn(guard);
    }

    return {
      visible: canSeeOrHearSprint,
      distanceToPlayer
    };
  }

  refreshGuardPathIfStuck(guard, deltaTime) {
    // If a guard stalls for too long, rebuild its current path based on its active FSM state.
    const moved = guard.position.distanceTo(guard.lastPositionForStuck);

    if (moved < this.guardTuning.stuckDistanceEpsilon) {
      guard.stuckTimer += deltaTime;
    } else {
      guard.stuckTimer = 0;
      guard.lastPositionForStuck.copy(guard.position);
    }

    if (guard.stuckTimer < this.guardTuning.stuckSeconds) return;

    guard.stuckTimer = 0;
    guard.lastPositionForStuck.copy(guard.position);

    if (this.isGuardState(guard, Guard.States.CHASE)) {
      this.assignPathToPosition(guard, this.player.position);
      return;
    }

    if (this.isGuardState(guard, Guard.States.SEARCH) && guard.lastSeenPlayerPosition) {
      this.assignPathToPosition(guard, guard.lastSeenPlayerPosition);
      return;
    }

    if (this.isGuardState(guard, Guard.States.RETURN) && guard.returnTargetTile) {
      this.assignPathToTile(guard, guard.returnTargetTile);
      return;
    }

    if (this.isGuardState(guard, Guard.States.PATROL)) {
      this.assignPathToTile(guard, guard.patrolRoute[guard.patrolIndex]);
    }
  }

  updateGuards(deltaTime) {
    // Guard movement combines  FSM decision making, JPS pathfinding, & Reynolds path following.
    const playerSprintSpeed =
      this.player.baseTopSpeed * (this.player.sprintMultiplier ?? this.playerTuning.sprintMultiplier);

    for (const guard of this.guards) {
      this.updateGuardPerception(guard);

      if (guard.pathTimer > 0) {
        guard.pathTimer -= deltaTime;
      }

      // Each branch below is one FSM state behaviour:
      // patrol, chase, search, or return.
      if (this.isGuardState(guard, Guard.States.PATROL)) {
        guard.topSpeed = GameConfig.guard.patrolSpeed;

        const patrolTarget = guard.patrolRoute[guard.patrolIndex];
        guard.returnTargetTile = patrolTarget ?? null;

        if (this.hasReachedTile(guard.position, patrolTarget, 0.6)) {
          this.advancePatrolRoute(guard);
          guard.returnTargetTile = guard.patrolRoute[guard.patrolIndex] ?? null;
        } else if (!guard.pathFollower || guard.pathFollower.path.size() === 0) {
          this.assignPathToTile(guard, patrolTarget);
        }
      } else if (this.isGuardState(guard, Guard.States.CHASE)) {
        guard.topSpeed = Math.max(
          GameConfig.guard.patrolSpeed + 1.05,
          playerSprintSpeed * 0.84
        );

        guard.lastSeenPlayerPosition = this.player.position.clone();

        if (
          guard.pathTimer <= 0 ||
          !guard.pathFollower ||
          guard.pathFollower.path.size() === 0
        ) {
          this.assignPathToPosition(guard, this.player.position);
          guard.pathTimer = GameConfig.guard.pathRecalcSeconds;
        }
      } else if (this.isGuardState(guard, Guard.States.SEARCH)) {
        guard.topSpeed = GameConfig.guard.patrolSpeed;

        const reachedLastSeen =
          guard.lastSeenPlayerPosition &&
          guard.position.distanceTo(guard.lastSeenPlayerPosition) <= 0.7;

        if (reachedLastSeen) {
          guard.velocity.multiplyScalar(0.84);
        } else if (
          !guard.pathFollower ||
          guard.pathFollower.path.size() === 0
        ) {
          if (guard.lastSeenPlayerPosition) {
            this.assignPathToPosition(guard, guard.lastSeenPlayerPosition);
          }
        }
      } else if (this.isGuardState(guard, Guard.States.RETURN)) {
        guard.topSpeed = GameConfig.guard.patrolSpeed;

        const returnTile = guard.returnTargetTile ?? guard.patrolRoute[guard.patrolIndex] ?? null;
        guard.returnTargetTile = returnTile;

        if (returnTile && this.hasReachedTile(guard.position, returnTile, 0.6)) {
          // Return -> Patrol once  guard has rejoined to its patrol route.
          this.enterGuardPatrol(guard);
        } else if (
          returnTile &&
          (!guard.pathFollower || guard.pathFollower.path.size() === 0)
        ) {
          this.assignPathToTile(guard, returnTile);
        }
      }

      // Guards are also slowed by water, but water stays walkable so JPS remains valid.
      const waterSlow = this.getWaterSlowMultiplierForPosition(guard.position);
      guard.isInWater = waterSlow < 1.0;
      guard.topSpeed *= waterSlow;

      this.refreshGuardPathIfStuck(guard, deltaTime);

      let force = new THREE.Vector3();

      if (guard.pathFollower && guard.pathFollower.path.size() > 0) {
        // Reynolds path following turns  grid path into smooth continuous motion.
        force.add(
          PathFollowSteering.reynolds(
            guard,
            0.35,
            1.2,
            this.pathDebug
          )
        );
      }

      // Separation is  used to stop guards from stacking together.
      force.add(
        GroupSteeringBehaviours.separate(
          guard,
          this.guards,
          GameConfig.guard.separationRadius
        ).multiplyScalar(GameConfig.guard.separationWeight)
      );

      guard.applyForce(force);
    }
  }

  resolveDamage(dt) {
    // Damage comes from obstacle collisions and close contact with guards.
    if (!this.player || this.gameState !== 'playing') return;

    const touchingObstacle = !!this.player.touchingObstacleNow;

    if (touchingObstacle && !this.player.wasTouchingObstacle) {
      this.damagePlayer(this.damageTuning.obstacleDamage);
      this.player.stunTimer = Math.max(
        this.player.stunTimer ?? 0,
        this.playerTuning.obstacleStunSeconds
      );
    }

    this.player.wasTouchingObstacle = touchingObstacle;

    this.player.enemyHitCooldownTimer = Math.max(
      0,
      this.player.enemyHitCooldownTimer - dt
    );

    if (this.player.enemyHitCooldownTimer <= 0) {
      for (const guard of this.guards) {
        const hitDistance = (this.player.radius ?? 0.7) + 0.95;

        if (guard.position.distanceTo(this.player.position) <= hitDistance) {
          this.damagePlayer(this.damageTuning.enemyDamage);
          this.player.enemyHitCooldownTimer = this.damageTuning.enemyHitCooldown;
          break;
        }
      }
    }
  }

  resolveAllEntityCollisions() {
    // Solid obstacle islands block both  player and guards.
    if (this.player) {
      this.clampEntityInsideMap(this.player, 0.55);

      const playerHitObstacle = this.resolveEntityObstacleCollision(
        this.player,
        this.player.radius ?? 0.7,
        this.playerTuning.collisionPadding
      );

      this.player.touchingObstacleNow = playerHitObstacle;
    }

    for (const guard of this.guards) {
      this.clampEntityInsideMap(guard, 0.55);

      this.resolveEntityObstacleCollision(
        guard,
        0.75,
        this.guardTuning.collisionPadding
      );
    }
  }

  checkWinLose() {
    // Win by reaching  goal tile. Lose when health reaches 0.
    if (this.gameState !== 'playing') return;

    if (this.player.health <= 0) {
      this.gameState = 'lose';
      return;
    }

    const playerTile = this.safeQuantize(this.player.position);
    if (playerTile === this.goalTile) {
      this.gameState = 'win';
    }
  }

  updateHud() {
    let status = 'Running';
    let objective = 'Reach the goal tile! (the orange tile)';

    if (this.player && this.player.stunTimer > 0 && this.gameState === 'playing') {
      status = 'Stunned';
    }

    if (this.gameState === 'win') {
      status = 'Escaped';
      objective = 'You escaped. Press R to restart.';
    } else if (this.gameState === 'lose') {
      status = 'Dead';
      objective = 'You are dead. Press R to restart.';
    }

    this.hud.update({
      health: this.player ? this.player.health : 100,
      maxHealth: this.player ? this.player.maxHealth : 100,
      state: status,
      objective
    });
  }

  update() {
    if (this.restartRequested) {
      this.restartRequested = false;
      this.init();
      return;
    }

    const dt = this.clock.getDelta();

    if (this.gameState === 'playing') {
      this.updatePlayer(dt);
      this.updateGuards(dt);

      for (const e of this.entities) {
        if (e.update) e.update(dt, this.map);
      }

      this.resolveAllEntityCollisions();
      this.resolveDamage(dt);
      this.checkWinLose();
    }

    this.updateHud();
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}