/**
 * The splash camera, with the same constants and arithmetic as Varin's
 * packages/ui/src/components/ui/varin-splash-camera.ts, so the site's floor and cube match the product.
 * CSS performs `perspective(d) rotateX(tilt) rotateZ(spin)`; this module performs the same projection
 * for the Canvas floor.
 */
export const CAMERA_TILT_DEG = 58;
export const CAMERA_SPIN_DEG = 45;
export const CAMERA_DISTANCE_PX = 1800;
/** Cube edge, and therefore the floor cell size. */
export const CELL_PX = 96;

const RAD = Math.PI / 180;

export interface ScreenPoint { readonly x: number; readonly y: number }

/** Project a floor point (z = 0) relative to the camera origin. Returns null behind the camera plane. */
export const projectFloor = (x: number, y: number, tiltDeg: number): (ScreenPoint & { w: number }) | null => {
  const spin = CAMERA_SPIN_DEG * RAD;
  const tilt = tiltDeg * RAD;
  const spunX = x * Math.cos(spin) - y * Math.sin(spin);
  const spunY = x * Math.sin(spin) + y * Math.cos(spin);
  const w = 1 - (spunY * Math.sin(tilt)) / CAMERA_DISTANCE_PX;
  if (w <= 0.02) return null;
  return { x: spunX / w, y: (spunY * Math.cos(tilt)) / w, w };
};

/** Inverse of projectFloor for a screen point relative to the origin. */
export const unprojectFloor = (screenX: number, screenY: number, tiltDeg: number): ScreenPoint | null => {
  const spin = CAMERA_SPIN_DEG * RAD;
  const tilt = tiltDeg * RAD;
  const denominator = Math.cos(tilt) + (screenY * Math.sin(tilt)) / CAMERA_DISTANCE_PX;
  if (denominator <= 1e-4) return null;
  const spunY = screenY / denominator;
  const w = 1 - (spunY * Math.sin(tilt)) / CAMERA_DISTANCE_PX;
  const spunX = screenX * w;
  return {
    x: spunX * Math.cos(spin) + spunY * Math.sin(spin),
    y: -spunX * Math.sin(spin) + spunY * Math.cos(spin),
  };
};

/**
 * How far above the origin the floor is worth drawing at the resting tilt. Beyond about 28 cells the rows
 * compress below readable size; the product fades its floor out at the same reach.
 */
export const VISIBLE_FAR_RISE_PX = (() => {
  const far = 28.5 * CELL_PX;
  const near = 9.5 * CELL_PX;
  const corners = [
    projectFloor(-far, -far, CAMERA_TILT_DEG),
    projectFloor(near, -far, CAMERA_TILT_DEG),
    projectFloor(near, near, CAMERA_TILT_DEG),
    projectFloor(-far, near, CAMERA_TILT_DEG),
  ].filter((point): point is NonNullable<typeof point> => point !== null);
  return -Math.min(...corners.map((point) => point.y));
})();

/** Solve a CSS cubic-bezier(x1, 0, x2, 1) curve for a progress value, as the product's Canvas does. */
export const cubicEase = (progress: number, x1: number, x2: number): number => {
  const coordinate = (a: number, b: number, t: number): number => {
    const inverse = 1 - t;
    return 3 * inverse * inverse * t * a + 3 * inverse * t * t * b + t * t * t;
  };
  const target = Math.min(1, Math.max(0, progress));
  let low = 0;
  let high = 1;
  for (let index = 0; index < 14; index += 1) {
    const candidate = (low + high) / 2;
    if (coordinate(x1, x2, candidate) < target) low = candidate;
    else high = candidate;
  }
  return coordinate(0, 1, (low + high) / 2);
};

export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
export const mix = (from: number, to: number, progress: number): number => from + (to - from) * progress;
export const smoothstep = (from: number, to: number, value: number): number => {
  const t = clamp((value - from) / Math.max(1e-6, to - from));
  return t * t * (3 - 2 * t);
};
