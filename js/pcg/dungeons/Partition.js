import { Rect } from "./util/Rect.js";
import { getRandomInt } from "./util/randomHelper.js";

export class Partition {

  // Constructor for partition
  constructor(x, y, w, h) {
    this.rect = new Rect(x, y, w, h);
    this.left = null;
    this.right = null;
  }

  // Is leaf method will check if our partition is a leaf
  isLeaf() {
    return !this.left && !this.right;
  }

  // Get all leaf partitions from the current partition
  getLeaves() {
    if (this.isLeaf()) return [this];

    // Use spread operator to return left and right partition leaves
    return [
      ...this.left.getLeaves(),
      ...this.right.getLeaves()
    ];
  }

  // Split method will split partitions recursively
  // Pass in a minimum size of a partition
  split(minSize) {

    // Check to see if we can split horizontally
    let canSplitH = this.rect.h >= minSize * 2;

    // Check to see if we can split vertically
    let canSplitV = this.rect.w >= minSize * 2;

    // If we cannot do either, return, this is a leaf
    if (!canSplitH && !canSplitV) return;

    // Check to see if we will split horizontally
    let splitH = canSplitH && (!canSplitV || Math.random() < 0.5);

    // If we are splitting horizontally
    if (splitH) {

      // Get a random horizontal split (y axis)
      let split = getRandomInt(minSize, this.rect.h - minSize);

      // Create a left partition
      this.left = 
        new Partition(
          this.rect.x,
          this.rect.y,
          this.rect.w,
          split
        );

      // Create a right partition
      this.right = 
        new Partition(
          this.rect.x,
          this.rect.y + split,
          this.rect.w,
          this.rect.h - split
        );

    } else {

      // We are splitting vertically

      // Get a random vertical split (x axis)
      let split = getRandomInt(minSize, this.rect.w - minSize);

      // Create a left partition
      this.left = 
        new Partition(
          this.rect.x,
          this.rect.y, 
          split,
          this.rect.h
        );
      
      // Create a right partition
      this.right = 
        new Partition(
          this.rect.x + split,
          this.rect.y,
          this.rect.w - split,
          this.rect.h
        );
    }

    // Recursive call to split children
    this.left.split(minSize);
    this.right.split(minSize);
  }

}