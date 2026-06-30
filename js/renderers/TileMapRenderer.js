import * as THREE from 'three';
import { Tile } from '../maps/Tile.js';

// Tile map renderer
export class TileMapRenderer {
  constructor(tileMap) {
    this.map = tileMap;

    const geometry = new THREE.BoxGeometry();

    const material = new THREE.MeshLambertMaterial({
      color: 0xffffff
    });

    this.mesh = new THREE.InstancedMesh(
      geometry,
      material,
      this.map.rows * this.map.cols
    );

    this.wallCount = 0;
    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        const tile = this.map.grid[r][c];
        if (tile.walls.north) this.wallCount++;
        if (tile.walls.west) this.wallCount++;
        if (tile.walls.south) this.wallCount++;
        if (tile.walls.east) this.wallCount++;
      }
    }

    this.wallGeometry = new THREE.BoxGeometry();
    this.wallMaterial = new THREE.MeshLambertMaterial({
      color: '#4a341f'
    });

    this.wallMesh = new THREE.InstancedMesh(
      this.wallGeometry,
      this.wallMaterial,
      this.wallCount
    );

    this.wallIndex = 0;

    for (let r = 0; r < this.map.rows; r++) {
      for (let c = 0; c < this.map.cols; c++) {
        const tile = this.map.grid[r][c];
        this.createTile(tile);
        this.createWalls(tile);
      }
    }

    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    this.wallMesh.instanceMatrix.needsUpdate = true;
  }

  createTile(tile) {
    const index = tile.row * this.map.cols + tile.col;
    this.mesh.setMatrixAt(index, this.getTileTransformation(tile));
    this.mesh.setColorAt(index, this.getTileColor(tile));
  }

  createWalls(tile) {
    const pos = this.map.localize(tile);
    const size = this.map.tileSize;
    const height = 10;
    const thickness = 0.1;

    const matrix = new THREE.Matrix4();

    if (tile.walls.north) {
      matrix.makeScale(size, height, thickness);
      matrix.setPosition(pos.x, height / 2, pos.z - size / 2);
      this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
    }

    if (tile.walls.south) {
      matrix.makeScale(size, height, thickness);
      matrix.setPosition(pos.x, height / 2, pos.z + size / 2);
      this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
    }

    if (tile.walls.west) {
      matrix.makeScale(thickness, height, size);
      matrix.setPosition(pos.x - size / 2, height / 2, pos.z);
      this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
    }

    if (tile.walls.east) {
      matrix.makeScale(thickness, height, size);
      matrix.setPosition(pos.x + size / 2, height / 2, pos.z);
      this.wallMesh.setMatrixAt(this.wallIndex++, matrix);
    }
  }

  getTileTransformation(tile) {
    const pos = this.map.localize(tile);
    pos.y = tile.height / 2;

    const matrix = new THREE.Matrix4();
    matrix.makeScale(this.map.tileSize, tile.height, this.map.tileSize);
    matrix.setPosition(pos);
    return matrix;
  }

  getTileColor(tile) {
    const isBorderTile =
      tile.row === 0 ||
      tile.col === 0 ||
      tile.row === this.map.rows - 1 ||
      tile.col === this.map.cols - 1;

    // Outer border is forced to a consistent muddy color for a cleaner map frame.
    if (isBorderTile) {
      return new THREE.Color('#837e7a');
    }

    if (tile.type === Tile.Type.Water) {
      const h = tile.height ?? 0.22;

      // Water color is visual only.
      // Water remains walkable in the grid and only slows movement in gameplay logic.
      if (h < 0.18) return new THREE.Color('#1f5f8f');
      if (h < 0.22) return new THREE.Color('#2873a8');
      if (h < 0.26) return new THREE.Color('#2f86bf');
      return new THREE.Color('#3d99d1');
    }

    if (tile.type === Tile.Type.Ground) {
      const h = tile.height ?? 0.6;

      // Slight color variation helps the swamp ground look less flat.
      if (h < 0.56) return new THREE.Color('#6b4f2a');
      if (h < 0.66) return new THREE.Color('#7a5a30');
      if (h < 0.76) return new THREE.Color('#8b6537');
      return new THREE.Color('#9a7340');
    }

    if (tile.type === Tile.Type.Obstacle) {
      const h = tile.height ?? 3.0;

      // Obstacle islands use greener shades so blocked elevated terrain stands out.
      if (h < 2.8) return new THREE.Color('#68853d');
      if (h < 3.2) return new THREE.Color('#6f9442');
      if (h < 3.8) return new THREE.Color('#5f833b');
      if (h < 4.4) return new THREE.Color('#4f7034');
      return new THREE.Color('#3f5f2c');
    }

    return new THREE.Color('#ff00ff');
  }

  setTileColor(tile, color) {
    const index = tile.row * this.map.cols + tile.col;
    this.mesh.setColorAt(index, color);
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
  }

  render(scene) {
    scene.add(this.mesh);
    scene.add(this.wallMesh);
  }
}