// Cluster class for HPAStar
export class Cluster {

  constructor(rowStart, rowEnd, colStart, colEnd) {

    this.rowStart = rowStart;
    this.rowEnd = rowEnd;

    this.colStart = colStart;
    this.colEnd = colEnd;

    this.transitions = [];

  }

  // Returns whether our cluster contains a particular tile
  contains(tile) {
    return (
      tile.row >= this.rowStart &&
      tile.row <= this.rowEnd &&
      tile.col >= this.colStart &&
      tile.col <= this.colEnd
    );
  }


}