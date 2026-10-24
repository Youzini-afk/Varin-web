import { CAMERA_TILT_DEG, CELL_PX, VISIBLE_FAR_RISE_PX, clamp, unprojectFloor } from './camera';

/**
 * The floor's tiles for one viewport, adapted from the product's buildAdaptiveSplashTiles.
 * Instead of a fixed board, the viewport is inverse-projected along the whole camera path (every tilt
 * and every origin the choreography uses), so wide windows gain tiles rather than stretching a board.
 */
export interface Tile {
  readonly row: number;
  readonly col: number;
  readonly x: number;
  readonly y: number;
  /** 0 at the cube's cell, 1 at the farthest tile: the reveal wave's order. */
  readonly order: number;
  readonly scatterX: number;
  readonly scatterY: number;
  readonly breatheDelayMs: number;
}

export interface FieldInput {
  readonly width: number;
  readonly height: number;
  /** Every origin height (in px from the top) the camera passes through. */
  readonly originYs: readonly number[];
  readonly scale: number;
  readonly seed: number;
}

const hash = (row: number, col: number, salt: number, seed: number): number => {
  let value = seed ^ salt;
  value = Math.imul(value ^ row, 0x45d9f3b);
  value = Math.imul(value ^ col, 0x119de1f3);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000;
};

/** Whether a tile breathes during one of its 2.8s cycles; deterministic, so resizes never pop the field. */
export const breathesInCycle = (row: number, col: number, cycle: number, share: number, seed: number): boolean => {
  let value = seed ^ 0x6d2b79f5;
  value = Math.imul(value ^ row, 0x45d9f3b);
  value = Math.imul(value ^ col, 0x119de1f3);
  value = Math.imul(value ^ cycle, 0x27d4eb2d);
  value ^= value >>> 16;
  return (value >>> 0) / 0x1_0000_0000 < share;
};

export const buildField = (input: FieldInput): Tile[] => {
  const points: Array<{ x: number; y: number }> = [{ x: 0, y: 0 }];
  const halfWidth = input.width / 2 / input.scale;
  for (const originY of input.originYs) {
    for (let tilt = CAMERA_TILT_DEG; tilt >= 0; tilt -= 2) {
      const top = tilt <= 1e-6 ? -originY / input.scale : Math.max(-originY / input.scale, -VISIBLE_FAR_RISE_PX);
      const bottom = (input.height - originY) / input.scale;
      for (const screenX of [-halfWidth, halfWidth]) {
        for (const screenY of [top, bottom]) {
          const point = unprojectFloor(screenX, screenY, tilt);
          if (point) points.push(point);
        }
      }
    }
  }
  const overscan = 2;
  const minCol = Math.floor(Math.min(...points.map((p) => p.x)) / CELL_PX) - overscan;
  const maxCol = Math.ceil(Math.max(...points.map((p) => p.x)) / CELL_PX) + overscan;
  const minRow = Math.floor(Math.min(...points.map((p) => p.y)) / CELL_PX) - overscan;
  const maxRow = Math.ceil(Math.max(...points.map((p) => p.y)) / CELL_PX) + overscan;
  const maxRadius = Math.max(1, Math.hypot(minCol, minRow), Math.hypot(minCol, maxRow), Math.hypot(maxCol, minRow), Math.hypot(maxCol, maxRow));

  const tiles: Tile[] = [];
  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      const radius = Math.hypot(col, row);
      // Same scatter as the product reveal: tiles drift outward, farther ones a little more.
      const magnitude = radius === 0 ? 0 : CELL_PX * (0.18 + 0.36 * clamp(radius / 6));
      tiles.push({
        row,
        col,
        x: col * CELL_PX,
        y: row * CELL_PX,
        order: clamp(radius / maxRadius),
        scatterX: radius === 0 ? 0 : (col / radius) * magnitude,
        scatterY: radius === 0 ? 0 : (row / radius) * magnitude,
        breatheDelayMs: Math.round(hash(row, col, 0x02e5be93, input.seed) * 2200),
      });
    }
  }
  return tiles;
};
