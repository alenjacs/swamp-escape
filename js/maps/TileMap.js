import * as THREE from 'three';
import { Tile } from './Tile.js';

export class TileMap {
  constructor(tileSize = 1, dimensions = { width: 20, depth: 20 }) {
    this.tileSize = tileSize;

    this.width = dimensions.width;
    this.depth = dimensions.depth;

    this.rows = this.depth;
    this.cols = this.width;

    this.minX = -(this.cols * this.tileSize) / 2;
    this.maxX = (this.cols * this.tileSize) / 2;
    this.minZ = -(this.rows * this.tileSize) / 2;
    this.maxZ = (this.rows * this.tileSize) / 2;

    this.grid = this.createEmptyGrid();
    this.walkableTiles = this.grid.flat().filter((tile) => tile.isWalkable());
  }

  createEmptyGrid() {
    const grid = [];

    for (let r = 0; r < this.rows; r++) {
      const row = [];

      for (let c = 0; c < this.cols; c++) {
        row.push(new Tile(r, c, Tile.Type.Ground));
      }

      grid.push(row);
    }

    return grid;
  }

  isInGrid(row, col) {
    return row >= 0 && row < this.rows && col >= 0 && col < this.cols;
  }

  getTile(row, col) {
    if (!this.isInGrid(row, col)) return null;
    return this.grid[row][col];
  }

  isWalkable(row, col) {
    // Pathfinding treats the map as a walkable/blocked grid.
    // Ground and water are walkable. Obstacle islands are blocked.
    if (!this.isInGrid(row, col)) return false;
    return this.grid[row][col].isWalkable();
  }

  localize(tile) {
    return new THREE.Vector3(
      this.minX + tile.col * this.tileSize + this.tileSize / 2,
      0,
      this.minZ + tile.row * this.tileSize + this.tileSize / 2
    );
  }

  quantize(position) {
    const col = Math.floor((position.x - this.minX) / this.tileSize);
    const row = Math.floor((position.z - this.minZ) / this.tileSize);

    if (!this.isInGrid(row, col)) return null;
    return this.grid[row][col];
  }

  getNeighbors(tile, allowDiagonals = false) {
    const dirs4 = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];

    const dirs8 = [
      [-1, -1],
      [-1, 1],
      [1, -1],
      [1, 1]
    ];

    const neighbors = [];

    for (const [dr, dc] of dirs4) {
      const nr = tile.row + dr;
      const nc = tile.col + dc;

      if (this.isInGrid(nr, nc) && this.grid[nr][nc].isWalkable()) {
        neighbors.push(this.grid[nr][nc]);
      }
    }

    if (allowDiagonals) {
      for (const [dr, dc] of dirs8) {
        const nr = tile.row + dr;
        const nc = tile.col + dc;

        if (this.isInGrid(nr, nc) && this.grid[nr][nc].isWalkable()) {
          neighbors.push(this.grid[nr][nc]);
        }
      }
    }

    return neighbors;
  }

  getCost(fromTile, toTile) {
    const dr = Math.abs(fromTile.row - toTile.row);
    const dc = Math.abs(fromTile.col - toTile.col);

    if (dr === 1 && dc === 1) return Math.SQRT2;
    return 1;
  }

  getRandomWalkableTile() {
    const walkable = this.grid.flat().filter((tile) => tile.isWalkable());
    if (walkable.length === 0) return null;

    const index = Math.floor(Math.random() * walkable.length);
    return walkable[index];
  }

  wrapPosition(position) {
    if (position.x < this.minX) position.x = this.maxX - this.tileSize * 0.5;
    else if (position.x > this.maxX) position.x = this.minX + this.tileSize * 0.5;

    if (position.z < this.minZ) position.z = this.maxZ - this.tileSize * 0.5;
    else if (position.z > this.maxZ) position.z = this.minZ + this.tileSize * 0.5;

    return position;
  }

  clampPosition(position, radius = 0) {
    position.x = Math.max(this.minX + radius, Math.min(this.maxX - radius, position.x));
    position.z = Math.max(this.minZ + radius, Math.min(this.maxZ - radius, position.z));
    return position;
  }
}