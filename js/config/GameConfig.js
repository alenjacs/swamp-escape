export const GameConfig = {
  map: {
    width: 60,
    depth: 60,
    tileSize: 2,
    obstacleThreshold: 0.58,
    noiseScale: 0.085,
    octaves: 4,
    persistence: 0.5,
    lacunarity: 2.0,
    clearRadius: 3,
    guardCount: 5
  },
  player: {
    radius: 0.7,
    topSpeed: 8,
    sprintMultiplier: 1.45,
    maxHealth: 100,
    contactDamagePerSecond: 20,
    sprintCooldown: 2.0,
    sprintDuration: 0.9
  },
  guard: {
    scale: { x: 1.1, y: 2.0, z: 1.1 },
    patrolSpeed: 3.2,
    chaseSpeed: 5.6,
    maxForce: 18,
    aggroRange: 12,
    loseRange: 16,
    attackRange: 1.2,
    pathRecalcSeconds: 0.5,
    searchSeconds: 2.5,
    waypointThreshold: 0.6,
    separationRadius: 2.2,
    separationWeight: 1.15
  },
  goal: {
    color: '#ff8c00'
  }
};
