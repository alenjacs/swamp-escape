// AbstractNode class for HPAStar
export class AbstractNode {

  constructor(tile, cluster) {

    this.tile = tile;
    this.cluster = cluster;
    this.neighbours = [];

  }

}