import { Tile } from '../maps/Tile.js';
import { Perlin } from './Perlin.js';

export class SwampGenerator {
  static generate(tileMap, config = {}) {
    const obstacleThreshold = config.obstacleThreshold ?? 0.58;
    const noiseScale = config.noiseScale ?? 0.085;
    const clearRadius = config.clearRadius ?? 3;
    const octaves = config.octaves ?? 4;
    const persistence = config.persistence ?? 0.5;
    const lacunarity = config.lacunarity ?? 2.0;

    const perlinSize = Math.max(tileMap.rows, tileMap.cols) + 20;

    // 1 Perlin field shapes general swamp terrain and obstacle islands.
    // 1 separate Perlin field is used to irregularly shape random water patches.
    const terrainPerlin = new Perlin(perlinSize);
    const waterShapePerlin = new Perlin(perlinSize + 17);

    const startRow = Math.floor(tileMap.rows * 0.1);
    const startCol = Math.floor(tileMap.cols * 0.1);
    const goalRow = Math.floor(tileMap.rows * 0.88);
    const goalCol = Math.floor(tileMap.cols * 0.88);

    let grid = [];

    for (let tries = 0; tries < 50; tries++) {
      grid = [];

      for (let r = 0; r < tileMap.rows; r++) {
        const row = [];

        for (let c = 0; c < tileMap.cols; c++) {
          const terrainSample = terrainPerlin.octaveNoise(
            r,
            c,
            noiseScale,
            octaves,
            persistence,
            lacunarity
          );

          const nearStart =
            Math.abs(r - startRow) <= clearRadius &&
            Math.abs(c - startCol) <= clearRadius;

          const nearGoal =
            Math.abs(r - goalRow) <= clearRadius &&
            Math.abs(c - goalCol) <= clearRadius;

          const borderWall =
            r === 0 ||
            c === 0 ||
            r === tileMap.rows - 1 ||
            c === tileMap.cols - 1;

          // High terrain noise becomes blocked obstacle islands.
          // Start and goal regions are kept clear so each run stays playable.
          const blocked =
            borderWall || (!nearStart && !nearGoal && terrainSample > obstacleThreshold);

          let type = Tile.Type.Ground;
          let height = 0.70;

          if (blocked) {
            type = Tile.Type.Obstacle;

            if (terrainSample > 0.86) height = 4.6;
            else if (terrainSample > 0.80) height = 4.0;
            else if (terrainSample > 0.74) height = 3.5;
            else if (terrainSample > 0.66) height = 3.0;
            else height = 2.6;
          } else {
            type = Tile.Type.Ground;

            // Ground height variation is visual only.
            // The pathfinding grid remains walkable/blocked rather than weighted.
            if (terrainSample < 0.24) height = 0.54;
            else if (terrainSample < 0.36) height = 0.62;
            else if (terrainSample < 0.48) height = 0.70;
            else if (terrainSample < 0.60) height = 0.78;
            else height = 0.86;
          }

          row.push(new Tile(r, c, type, height));
        }

        grid.push(row);
      }

      // Water is added after terrain generation so patches appear random each run.
      this.addRandomWaterPatches(
        grid,
        startRow,
        startCol,
        goalRow,
        goalCol,
        waterShapePerlin
      );

      // Regenerate until there is at least 1 simple path from start to goal.
      if (this.hasSimplePath(grid, startRow, startCol, goalRow, goalCol)) {
        return {
          grid,
          startRow,
          startCol,
          goalRow,
          goalCol
        };
      }
    }

    // Fallback map if repeated procedural attempts fail.
    grid = [];

    for (let r = 0; r < tileMap.rows; r++) {
      const row = [];

      for (let c = 0; c < tileMap.cols; c++) {
        const nearStart =
          Math.abs(r - startRow) <= clearRadius &&
          Math.abs(c - startCol) <= clearRadius;

        const nearGoal =
          Math.abs(r - goalRow) <= clearRadius &&
          Math.abs(c - goalCol) <= clearRadius;

        const borderWall =
          r === 0 ||
          c === 0 ||
          r === tileMap.rows - 1 ||
          c === tileMap.cols - 1;

        let type = Tile.Type.Ground;
        let height = 0.70;

        if (borderWall) {
          type = Tile.Type.Obstacle;
          height = 2.8;
        }

        row.push(new Tile(r, c, type, height));
      }

      grid.push(row);
    }

    this.addRandomWaterPatches(
      grid,
      startRow,
      startCol,
      goalRow,
      goalCol,
      waterShapePerlin
    );

    return {
      grid,
      startRow,
      startCol,
      goalRow,
      goalCol
    };
  }

  static addRandomWaterPatches(grid, startRow, startCol, goalRow, goalCol, waterShapePerlin) {
    const rows = grid.length;
    const cols = grid[0].length;

    // Create several water regions at random positions each run.
    // Water stays walkable, so it affects movement speed but does not invalidate JPS.
    const patchCount = 4 + Math.floor(Math.random() * 4);
    let created = 0;
    let attempts = 0;

    while (created < patchCount && attempts < 300) {
      attempts++;

      const centerRow = 4 + Math.floor(Math.random() * (rows - 8));
      const centerCol = 4 + Math.floor(Math.random() * (cols - 8));
      const radius = 3 + Math.floor(Math.random() * 4);

      const tooCloseToStart =
        Math.abs(centerRow - startRow) + Math.abs(centerCol - startCol) < 10;

      const tooCloseToGoal =
        Math.abs(centerRow - goalRow) + Math.abs(centerCol - goalCol) < 10;

      if (tooCloseToStart || tooCloseToGoal) continue;

      const centerTile = grid[centerRow][centerCol];
      if (!centerTile || centerTile.type === Tile.Type.Obstacle) continue;

      let convertedCount = 0;

      for (let r = centerRow - radius - 1; r <= centerRow + radius + 1; r++) {
        for (let c = centerCol - radius - 1; c <= centerCol + radius + 1; c++) {
          if (r < 2 || c < 2 || r >= rows - 2 || c >= cols - 2) continue;

          const tile = grid[r][c];
          if (!tile || tile.type === Tile.Type.Obstacle) continue;

          const dx = c - centerCol;
          const dy = r - centerRow;
          const dist = Math.sqrt(dx * dx + dy * dy);

          // Local Perlin noise breaks the patch outline so water is not a perfect circle.
          const shapeNoise = waterShapePerlin.octaveNoise(
            r + centerRow * 7,
            c + centerCol * 11,
            0.12,
            3,
            0.5,
            2.0
          );

          const noisyRadius = radius + (shapeNoise - 0.5) * 2.2;

          const nearStart =
            Math.abs(r - startRow) + Math.abs(c - startCol) <= 6;

          const nearGoal =
            Math.abs(r - goalRow) + Math.abs(c - goalCol) <= 6;

          if (nearStart || nearGoal) continue;

          if (dist <= noisyRadius) {
            tile.type = Tile.Type.Water;
            tile.cost = Tile.Cost.get(Tile.Type.Water);

            // Lower heights make water visually sit below the swamp ground.
            if (dist <= noisyRadius * 0.45) tile.height = 0.10;
            else if (dist <= noisyRadius * 0.70) tile.height = 0.14;
            else tile.height = 0.20;

            convertedCount++;
          }
        }
      }

      if (convertedCount >= 12) {
        created++;
      }
    }
  }

  static hasSimplePath(grid, startRow, startCol, goalRow, goalCol) {
    // Simple BFS check used only to reject bad procedural layouts before gameplay starts.
    const rows = grid.length;
    const cols = grid[0].length;
    const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
    const queue = [[startRow, startCol]];

    visited[startRow][startCol] = true;

    const dirs = [
      [-1, 0],
      [1, 0],
      [0, -1],
      [0, 1]
    ];

    while (queue.length > 0) {
      const [r, c] = queue.shift();

      if (r === goalRow && c === goalCol) return true;

      for (const [dr, dc] of dirs) {
        const nr = r + dr;
        const nc = c + dc;

        if (
          nr >= 0 &&
          nr < rows &&
          nc >= 0 &&
          nc < cols &&
          !visited[nr][nc] &&
          grid[nr][nc].isWalkable()
        ) {
          visited[nr][nc] = true;
          queue.push([nr, nc]);
        }
      }
    }

    return false;
  }
}