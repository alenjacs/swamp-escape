import { Rect } from "./util/Rect.js";
import { getRandomInt } from "./util/randomHelper.js";
import { Partition } from "./Partition.js";
import { Tile } from "../../maps/Tile.js";


export class DungeonGenerator {

  // Generate our dungeon on the map
  static generate(map, minRoomSize) {

    let root = new Partition(0, 0, map.cols, map.rows);

    let minPartitionSize = minRoomSize * 2;
    root.split(minPartitionSize);

    // These are the partitions at the correct size
    let partitions = root.getLeaves();
    let rooms = this.createRooms(partitions, map, minRoomSize);

    // Create connections between rooms
    let connections = this.createConnections(rooms);

    // Iterate over connections to carve corridors
    for (let con of connections) {
      this.carveCorridor(con.from, con.to, map);
    }
  }

  // Create rooms to create rooms on our map
  static createRooms(partitions, map, minRoomSize) {

    // Initialize an empty array of rooms
    let rooms = [];

    // For each partition
    // generate a random room that fits
    for (let part of partitions) {

      let roomW = getRandomInt(minRoomSize, part.rect.w - 2);
      let roomH = getRandomInt(minRoomSize, part.rect.h - 2);

      let roomX = 
        getRandomInt(
          part.rect.x + 1, 
          part.rect.x + part.rect.w - roomW - 1 
        );

      let roomY = 
        getRandomInt(
          part.rect.y + 1,
          part.rect.y + part.rect.h - roomH - 1
        );
      
      rooms.push(new Rect(roomX, roomY, roomW, roomH));

      // Set the tiles in each room to be walkable
      for (let i = roomX; i < roomX + roomW; i++) {
        for (let j = roomY; j < roomY + roomH; j++) {
          let tile = map.grid[i][j];
          tile.type = Tile.Type.Ground;
        }
      }
    }
    return rooms;
  }

  // Create connections between rooms
  // Finding the minimum spanning tree (MST)
  static createConnections(rooms) {

    // Create an empty array of cnonections
    // Which will hold object literals for to and from
    let connections = [];

    // Keep track of whats connected
    let connected = new Set();
    connected.add(rooms[0]);

    // Keep track of whats remaining
    let remaining = new Set();
    for (let r of rooms) {
      if (r !== rooms[0]) {
        remaining.add(r);
      }
    }

    // While remaining is not empty
    while (remaining.size > 0) {
      let best = Infinity;
      let from = null;
      let to = null;

      // For all connected rooms
      // Look for shortest distance to a remaining room
      for (let r1 of connected) {
        for (let r2 of remaining) {

          let r1Pos = r1.getCenter();
          let r2Pos = r2.getCenter();

          let dist = Math.abs(r1Pos.x - r2Pos.x) + Math.abs(r1Pos.y - r2Pos.y);

          if (dist < best) {
            best = dist;
            from = r1;
            to = r2;
          }
        }
      }

      // Add our shortest connection TO to the connected Set
      connected.add(to);
      // Remove it from our remaining Set
      remaining.delete(to);
      // Push to our list of connections
      connections.push({from: from, to: to});
    }
    return connections;
  }

  // Carve corridor between room a and room b
  // via the room centers
  static carveCorridor(a, b, map) {
    let centerA = a.getCenter();
    let centerB = b.getCenter();

    if (Math.random() < 0.5) {
      // Horizontal, then vertical
      this.carveHorizontal(centerA.x, centerB.x, centerA.y, map);
      this.carveVertical(centerA.y, centerB.y, centerB.x, map);
    } else {
      // Vertical, then horizontal
      this.carveVertical(centerA.y, centerB.y, centerA.x, map);
      this.carveHorizontal(centerA.x, centerB.x, centerB.y, map);
    }
  }

  // Carve a horizontal path
  static carveHorizontal(x1, x2, y, map) {
    let start = Math.min(x1, x2);
    let end = Math.max(x1, x2);

    // Iterate from the start to end of the corridor
    for (let x = start; x <= end; x++) {
      let tile = map.grid[x][y];
      tile.type = Tile.Type.Ground;
    }
  }

  // Carve a vertical path
  static carveVertical(y1, y2, x, map) {
    let start = Math.min(y1, y2);
    let end = Math.max(y1, y2);

    // Iterate from start to end of the corridor
    for (let y = start; y <= end; y++) {
      let tile = map.grid[x][y];
      tile.type = Tile.Type.Ground;
    }
  }

}