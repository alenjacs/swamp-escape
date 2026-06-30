import { MinHeap } from "./util/MinHeap.js";
import { Pathfinder } from "./Pathfinder.js";

export class JPS extends Pathfinder {
  constructor(map, heuristic, tileMapRenderer) {
    super();
    this.map = map;
    this.heuristic = heuristic;
    this.tileMapRenderer = tileMapRenderer;
  }

  findPath(start, goal) {
    // JPS is used here on a uniform-cost walkable/blocked tile grid.
    // Water remains walkable in this project, so JPS stays valid.
    let open = new MinHeap();
    let costs = new Map();
    let parents = new Map();

    costs.set(start, 0);
    parents.set(start, null);

    open.enqueue(start, this.heuristic(start, goal, 1));

    while (!open.isEmpty()) {
      let current = open.dequeue();

      if (current === goal) {
        return this.tracePath(parents, start, goal);
      }

      for (let neighbour of this.identifySuccessors(current, goal, parents)) {
        let newCost = costs.get(current) + this.heuristic(current, neighbour, 1);

        if (!costs.has(neighbour) || newCost < costs.get(neighbour)) {
          costs.set(neighbour, newCost);
          parents.set(neighbour, current);

          let f = newCost + this.heuristic(neighbour, goal, 1);
          open.enqueue(neighbour, f);
        }
      }
    }

    return [];
  }

  identifySuccessors(node, goal, parents) {
    let successors = [];
    let parent = parents.get(node);

    // JPS does not expand every neighbour like basic A*.
    // It first prunes directions, then jumps forward until it finds a useful jump point.
    let directions = this.pruneDirections(node, parent);

    for (let dir of directions) {
      let jp = this.jump(node, dir[0], dir[1], goal);

      if (jp) {
        successors.push(jp);
      }
    }

    return successors;
  }

  pruneDirections(node, parent) {
    // At the start node, all 4 cardinal directions are allowed.
    if (!parent) {
      return [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1]
      ];
    }

    let dr = Math.sign(node.row - parent.row);
    let dc = Math.sign(node.col - parent.col);

    // After the first move, JPS keeps moving in the travel direction
    // and only keeps directions that could expose forced neighbours.
    if (dc !== 0) {
      return [
        [0, dc],
        [-1, 0],
        [1, 0]
      ];
    } else {
      return [
        [dr, 0],
        [0, -1],
        [0, 1]
      ];
    }
  }

  jump(node, dr, dc, goal) {
    let r = node.row + dr;
    let c = node.col + dc;

    // Stop when the next tile is blocked or outside the walkable grid.
    if (!this.map.isWalkable(r, c)) return null;

    let neighbour = this.map.grid[r][c];

    // Reaching the goal always ends the jump successfully.
    if (neighbour === goal) return neighbour;

    if (dc !== 0) {
      // Horizontal movement:
      // return this tile if an obstacle creates a forced neighbour above or below.
      if (
        (this.map.isWalkable(r - 1, c) && !this.map.isWalkable(r - 1, c - dc)) ||
        (this.map.isWalkable(r + 1, c) && !this.map.isWalkable(r + 1, c - dc))
      ) {
        return neighbour;
      }
    } else if (dr !== 0) {
      // Vertical movement:
      // return this tile if an obstacle creates a forced neighbour on the left or right.
      if (
        (this.map.isWalkable(r, c - 1) && !this.map.isWalkable(r - dr, c - 1)) ||
        (this.map.isWalkable(r, c + 1) && !this.map.isWalkable(r - dr, c + 1))
      ) {
        return neighbour;
      }

      // While moving vertically, horizontal jump points can also force this node to matter.
      if (
        this.jump(neighbour, 0, -1, goal) ||
        this.jump(neighbour, 0, 1, goal)
      ) {
        return neighbour;
      }
    }

    // Otherwise continue jumping forward in the same direction.
    return this.jump(neighbour, dr, dc, goal);
  }
}