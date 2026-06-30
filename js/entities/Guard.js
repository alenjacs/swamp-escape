import * as THREE from 'three';
import { DynamicEntity } from './DynamicEntity.js';

export class Guard extends DynamicEntity {
  static States = Object.freeze({
    PATROL: 'patrol',
    CHASE: 'chase',
    SEARCH: 'search',
    RETURN: 'return'
  });

  static StateColors = Object.freeze({
    patrol: '#ef4444',
    chase: '#f97316',
    search: '#facc15',
    return: '#a855f7'
  });

  constructor(config = {}) {
    super({
      color: Guard.StateColors.patrol,
      topSpeed: config.topSpeed ?? 3.2,
      maxForce: config.maxForce ?? 18,
      scale: new THREE.Vector3(1.1, 2.0, 1.1),
      ...config
    });

    // Guard state is used by the finite state machine in World.js.
    this.state = Guard.States.PATROL;

    // Current path data used for JPS + path following.
    this.path = [];
    this.pathIndex = 0;

    // Last seen player position supports Chase -> Search behaviour.
    this.lastSeenPlayerPosition = null;

    // Path recalculation timer keeps chase updates responsive without recalculating every frame.
    this.pathRecalcSeconds = config.pathRecalcSeconds ?? 0.5;
    this.pathTimer = 0;

    // Search timer controls how long the guard investigates before returning to patrol.
    this.searchTimer = 0;
    this.searchDuration = config.searchDuration ?? 2.2;

    // Return target tile is the patrol tile the guard rejoins after searching.
    this.returnTargetTile = null;

    // State color is used as a visible FSM cue for debugging and grading.
    this.debugColor = Guard.StateColors.patrol;
  }

  setState(nextState) {
    this.state = nextState;

    const stateColor = Guard.StateColors[nextState] ?? Guard.StateColors.patrol;
    this.debugColor = stateColor;
    this.setColor(stateColor);
  }

  setPath(path = []) {
    this.path = path;
    this.pathIndex = 0;
  }

  clearPath() {
    this.path = [];
    this.pathIndex = 0;
  }

  update(deltaTime, map) {
    // Timers are reduced every frame so FSM transitions can happen at the right time.
    this.pathTimer = Math.max(0, this.pathTimer - deltaTime);

    if (this.searchTimer > 0) {
      this.searchTimer = Math.max(0, this.searchTimer - deltaTime);
    }

    super.update(deltaTime, map);
  }
}