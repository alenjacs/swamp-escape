import { MinHeap } from "./util/MinHeap.js";
import { Pathfinder } from "./Pathfinder.js";


export class AStar extends Pathfinder {

  constructor(heuristic) {
    super();
    this.heuristic = heuristic;
  }

  // AStar find path
  findPath(start, end, map) {

    let open = new MinHeap();
    let costs = new Map();
    let parents = new Map();

    costs.set(start, 0);
    parents.set(start, null);
    open.enqueue(start, this.heuristic(start, end, map.tileSize));


    while (!open.isEmpty()) {
      let current = open.dequeue();

      if (current === end) {
        return this.tracePath(parents, start, end);
      }

      for (let neighbour of map.getNeighbours(current)) {

        let newCost = costs.get(current) + neighbour.cost;

        if (!costs.has(neighbour) || newCost < costs.get(neighbour)) {

          parents.set(neighbour, current);
          costs.set(neighbour, newCost);

          let priority = newCost + this.heuristic(neighbour, end, map.tileSize);
          open.enqueue(neighbour, priority);
        }
      }
    }
    return [];
  }

  // Heuristic functions
  static manhattan(start, end, tileSize) {

    let dRow = Math.abs(start.row - end.row);
    let dCol = Math.abs(start.col - end.col);

    return (dRow + dCol) * tileSize;
  }

  static diagonal(start, end, tileSize) {

    let dRow = Math.abs(start.row - end.row);
    let dCol = Math.abs(start.col - end.col);

    let minD = Math.min(dRow, dCol);
    let maxD = Math.max(dRow, dCol);

    return (minD * Math.SQRT2 + (maxD - minD)) * tileSize;
  }

  static euclidian(start, end, tileSize) {

    let dRow = Math.abs(start.row - end.row);
    let dCol = Math.abs(start.col - end.col);

    return Math.sqrt(dRow * dRow + dCol * dCol) * tileSize;

  }

}