import * as THREE from 'three'
import { Pathfinder } from "../Pathfinder.js";
import { MinHeap } from "../util/MinHeap.js";
import { Cluster } from "./Cluster.js";
import { AbstractNode } from "./AbstractNode.js";

export class HPAStar extends Pathfinder {

  constructor(map, heuristic, tileMapRenderer, clusterSize = 5) {
    super();
    this.map = map;
    this.clusterSize = clusterSize;
    this.tileMapRenderer = tileMapRenderer;

    this.heuristic = heuristic;

    this.clusters = [];
  
  }

  // Code here!

  // Preprocess our graph
  preprocess() {
    this.buildClusters();
    this.buildTransitions()
  }

  // Build our clusters and add to our cluster list
  buildClusters() {

    for (let r = 0; r < this.map.rows; r += this.clusterSize) {
      for (let c = 0; c < this.map.cols; c += this.clusterSize) {

        let rowStart = r;
        let rowEnd = Math.min(r + this.clusterSize - 1, this.map.rows - 1);

        let colStart = c;
        let colEnd = Math.min(c + this.clusterSize - 1, this.map.cols - 1);

        this.clusters.push(
          new Cluster(rowStart, rowEnd, colStart, colEnd)
        );
      }
    }
  }
  
  // Build transitions
  buildTransitions() {
    for (let cluster of this.clusters) {
      // scan horizontal edge (bottom)
      this.scanBorder(cluster, true);
      // scan vertical edge (right)
      this.scanBorder(cluster, false);
    }
  }

  // Do the scanning on either horizontal or vertical
  scanBorder(cluster, horizontal) {

    let border = horizontal ? cluster.rowEnd : cluster.colEnd;
    let rangeStart = horizontal ? cluster.colStart : cluster.rowStart;
    let rangeEnd = horizontal ? cluster.colEnd : cluster.rowEnd;
    let limit = horizontal ? this.map.rows : this.map.cols;

    // No clusters in that direction
    if (border + 1 >= limit) return;

    // Iterate from range start to end to find border nodes
    for (let pos = rangeStart; pos <= rangeEnd; pos++) {

      let tileA = horizontal ? this.map.grid[border][pos] : this.map.grid[pos][border];
      let tileB = horizontal ? this.map.grid[border + 1][pos] : this.map.grid[pos][border + 1];

      if (tileA.isWalkable() && tileB.isWalkable()) {
        // create inter edge between the clusters
      }
    }

  }




  /**
   * Modified A*
   * Changes:
   *  - Works on both tile maps (low level) and abstract/hierarchical graph (high levels)
   *  - Optional cluster (low level map only), to restrict searching
   *  - Returns both path and cost
   */
  modifiedAStar(start, end, cluster = null) {
    let open = new MinHeap();
    let costs = new Map();
    let parents = new Map();

    // Infer if hierarchical
    let highLevel = start.tile != null;

    costs.set(start, 0);
    parents.set(start, null);
    open.enqueue(start, this.heuristic(start.tile ?? start, end.tile ?? end, 1));

    while (!open.isEmpty()) {
      let current = open.dequeue();

      // Found goal!
      if (current === end) {
        return { path: this.tracePath(parents, start, end), cost: costs.get(end) };
      }

      // Use { neighbour, cost } to refer to neighbours regardless of graph type
      let neighbours = highLevel
        ? current.neighbours
        : this.map.getNeighbours(current).map(n => ({ neighbour: n, cost: n.cost }));

      for (let { neighbour, cost } of neighbours) {

        // Skip nodes outside the cluster (low level)
        if (!highLevel && cluster && !cluster.contains(neighbour)) continue;

        let newCost = costs.get(current) + cost;

        if (!costs.has(neighbour) || newCost < costs.get(neighbour)) {
          parents.set(neighbour, current);
          costs.set(neighbour, newCost);

          let h = this.heuristic(neighbour.tile ?? neighbour, end.tile ?? end, 1);
          open.enqueue(neighbour, newCost + h);
        }
      }
    }

    // No path found
    return { path: [], cost: Infinity };
  }
}