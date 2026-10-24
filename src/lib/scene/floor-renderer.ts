import { CAMERA_DISTANCE_PX, CAMERA_SPIN_DEG, CELL_PX } from './camera';

/**
 * Draws the floor's tiles through the shared camera. WebGL2 with instancing is the normal path; Canvas 2D
 * is the fallback. Ported from the product splash renderer (varin-splash-canvas.ts), with the projection
 * origin and scale passed per frame because the site's camera also rises and scales with the layout.
 */
export type Rgba = readonly [number, number, number, number];

export interface FloorColors { background: Rgba; line: Rgba; pulse: Rgba }

/** Per-tile values, five floats each: x, y, scale, opacity, fillMix. */
export const TILE_STRIDE = 5;

export interface FloorFrame {
  readonly data: Float32Array;
  readonly count: number;
  readonly tiltDeg: number;
  readonly originX: number;
  readonly originY: number;
  readonly scale: number;
}

export interface FloorRenderer {
  readonly kind: 'webgl2' | '2d';
  setColors(colors: FloorColors): void;
  resize(width: number, height: number, pixelRatio: number): void;
  draw(frame: FloorFrame): void;
  dispose(): void;
}

const VERTEX = `#version 300 es
precision highp float;
layout(location=0) in vec2 aCenter;
layout(location=1) in float aScale;
layout(location=2) in float aOpacity;
layout(location=3) in float aFillMix;
uniform vec2 uViewport;
uniform vec2 uOrigin;
uniform float uSceneScale;
uniform float uCellSize;
uniform float uDistance;
uniform float uSpin;
uniform float uTilt;
out vec2 vUv;
out float vOpacity;
out float vFillMix;
const vec2 corners[6] = vec2[6](
  vec2(-0.5,-0.5), vec2(0.5,-0.5), vec2(-0.5,0.5),
  vec2(-0.5,0.5), vec2(0.5,-0.5), vec2(0.5,0.5)
);
void main() {
  vec2 corner = corners[gl_VertexID];
  vec2 floorPoint = aCenter + corner * uCellSize * aScale;
  float spunX = floorPoint.x * cos(uSpin) - floorPoint.y * sin(uSpin);
  float spunY = floorPoint.x * sin(uSpin) + floorPoint.y * cos(uSpin);
  float w = 1.0 - spunY * sin(uTilt) / uDistance;
  if (w <= 0.02) {
    gl_Position = vec4(2.0, 2.0, 0.0, 1.0);
    vOpacity = 0.0;
  } else {
    // Keep the projection denominator as homogeneous W so UVs are perspective-correct across the quad.
    vec2 projected = vec2(spunX, spunY * cos(uTilt)) * uSceneScale;
    vec2 clip = (projected + uOrigin * w) / uViewport * 2.0 - vec2(w);
    gl_Position = vec4(clip.x, -clip.y, 0.0, w);
    vOpacity = aOpacity;
  }
  vUv = corner + 0.5;
  vFillMix = aFillMix;
}`;

const FRAGMENT = `#version 300 es
precision highp float;
uniform vec4 uBackground;
uniform vec4 uLine;
uniform vec4 uPulse;
uniform float uBorder;
uniform float uRenderScale;
in vec2 vUv;
in float vOpacity;
in float vFillMix;
out vec4 outputColor;
void main() {
  vec4 tile = mix(uBackground, uPulse, vFillMix);
  // Measure the line in physical pixels so diagonal lines stay continuous after perspective compression.
  vec2 footprint = max(fwidth(vUv), vec2(0.000001));
  vec2 edgeDistancePx = (vec2(1.0) - vUv) / footprint;
  vec2 lineWidthPx = max(vec2(uBorder) / footprint, vec2(uRenderScale));
  vec2 coverage2 = vec2(1.0) - smoothstep(max(lineWidthPx - 0.75, vec2(0.0)), lineWidthPx + 0.75, edgeDistancePx);
  // Near the horizon a cell is only a few line widths tall; fade the lines instead of letting them merge.
  vec2 density = smoothstep(vec2(uRenderScale * 3.0), vec2(uRenderScale * 6.0), vec2(1.0) / footprint);
  float coverage = max(coverage2.x * density.x, coverage2.y * density.y);
  vec3 color = mix(tile.rgb, uLine.rgb, clamp(coverage * uLine.a, 0.0, 1.0));
  outputColor = vec4(color, tile.a * vOpacity);
}`;

const createWebGl = (canvas: HTMLCanvasElement): FloorRenderer | null => {
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, premultipliedAlpha: false });
  if (!gl) return null;
  const compile = (type: number, source: string): WebGLShader => {
    const shader = gl.createShader(type);
    if (!shader) throw new Error('shader allocation failed');
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(shader) ?? 'shader compile failed');
    return shader;
  };
  try {
    const program = gl.createProgram();
    if (!program) throw new Error('program allocation failed');
    const vertex = compile(gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl.FRAGMENT_SHADER, FRAGMENT);
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program) ?? 'link failed');
    gl.useProgram(program);
    gl.disable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    if (!buffer || !vao) throw new Error('buffer allocation failed');
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    const stride = TILE_STRIDE * 4;
    const attribute = (location: number, size: number, offset: number): void => {
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, size, gl.FLOAT, false, stride, offset * 4);
      gl.vertexAttribDivisor(location, 1);
    };
    attribute(0, 2, 0);
    attribute(1, 1, 2);
    attribute(2, 1, 3);
    attribute(3, 1, 4);

    const uniform = (name: string): WebGLUniformLocation => {
      const location = gl.getUniformLocation(program, name);
      if (location === null) throw new Error(`missing uniform ${name}`);
      return location;
    };
    const u = {
      viewport: uniform('uViewport'), origin: uniform('uOrigin'), sceneScale: uniform('uSceneScale'),
      cellSize: uniform('uCellSize'), distance: uniform('uDistance'), spin: uniform('uSpin'), tilt: uniform('uTilt'),
      background: uniform('uBackground'), line: uniform('uLine'), pulse: uniform('uPulse'),
      border: uniform('uBorder'), renderScale: uniform('uRenderScale'),
    };
    gl.uniform1f(u.cellSize, CELL_PX);
    gl.uniform1f(u.distance, CAMERA_DISTANCE_PX);
    gl.uniform1f(u.spin, (CAMERA_SPIN_DEG * Math.PI) / 180);
    gl.uniform1f(u.border, 1 / CELL_PX);
    let allocated = 0;
    let cssWidth = 1;
    let cssHeight = 1;

    return {
      kind: 'webgl2',
      setColors: (colors) => {
        gl.uniform4fv(u.background, colors.background);
        gl.uniform4fv(u.line, colors.line);
        gl.uniform4fv(u.pulse, colors.pulse);
      },
      resize: (width, height, pixelRatio) => {
        cssWidth = width;
        cssHeight = height;
        canvas.width = Math.max(1, Math.round(width * pixelRatio));
        canvas.height = Math.max(1, Math.round(height * pixelRatio));
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform1f(u.renderScale, pixelRatio);
      },
      draw: (frame) => {
        gl.bindVertexArray(vao);
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
        if (allocated < frame.data.byteLength) {
          gl.bufferData(gl.ARRAY_BUFFER, frame.data.byteLength, gl.DYNAMIC_DRAW);
          allocated = frame.data.byteLength;
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, frame.data, 0, frame.count * TILE_STRIDE);
        gl.uniform2f(u.viewport, cssWidth, cssHeight);
        gl.uniform2f(u.origin, frame.originX, frame.originY);
        gl.uniform1f(u.sceneScale, frame.scale);
        gl.uniform1f(u.tilt, (frame.tiltDeg * Math.PI) / 180);
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        if (frame.count > 0) gl.drawArraysInstanced(gl.TRIANGLES, 0, 6, frame.count);
      },
      dispose: () => {
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
        gl.deleteProgram(program);
      },
    };
  } catch {
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return null;
  }
};

const create2d = (canvas: HTMLCanvasElement): FloorRenderer | null => {
  const context = canvas.getContext('2d');
  if (!context) return null;
  let colors: FloorColors = { background: [1, 1, 1, 1], line: [0, 0, 0, 0.15], pulse: [0.9, 0.9, 0.9, 1] };
  let width = 1;
  let height = 1;
  let ratio = 1;
  const css = (value: Rgba): string => `rgba(${Math.round(value[0] * 255)},${Math.round(value[1] * 255)},${Math.round(value[2] * 255)},${value[3]})`;
  const spin = (CAMERA_SPIN_DEG * Math.PI) / 180;
  return {
    kind: '2d',
    setColors: (next) => { colors = next; },
    resize: (w, h, pixelRatio) => {
      width = w;
      height = h;
      ratio = Math.min(pixelRatio, 1.5);
      canvas.width = Math.max(1, Math.round(w * ratio));
      canvas.height = Math.max(1, Math.round(h * ratio));
    },
    draw: (frame) => {
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
      context.clearRect(0, 0, width, height);
      const tilt = (frame.tiltDeg * Math.PI) / 180;
      const project = (x: number, y: number): [number, number] | null => {
        const spunX = x * Math.cos(spin) - y * Math.sin(spin);
        const spunY = x * Math.sin(spin) + y * Math.cos(spin);
        const w = 1 - (spunY * Math.sin(tilt)) / CAMERA_DISTANCE_PX;
        if (w <= 0.02) return null;
        return [frame.originX + (spunX * frame.scale) / w, frame.originY + (spunY * Math.cos(tilt) * frame.scale) / w];
      };
      context.lineWidth = 1;
      context.strokeStyle = css(colors.line);
      for (let index = 0; index < frame.count; index += 1) {
        const offset = index * TILE_STRIDE;
        const opacity = frame.data[offset + 3] ?? 0;
        if (opacity <= 0) continue;
        const x = frame.data[offset] ?? 0;
        const y = frame.data[offset + 1] ?? 0;
        const half = (CELL_PX * (frame.data[offset + 2] ?? 1)) / 2;
        const fillMix = frame.data[offset + 4] ?? 0;
        const a = project(x - half, y - half);
        const b = project(x + half, y - half);
        const c = project(x + half, y + half);
        const d = project(x - half, y + half);
        if (!a || !b || !c || !d) continue;
        const fill: Rgba = [
          colors.background[0] + (colors.pulse[0] - colors.background[0]) * fillMix,
          colors.background[1] + (colors.pulse[1] - colors.background[1]) * fillMix,
          colors.background[2] + (colors.pulse[2] - colors.background[2]) * fillMix,
          colors.background[3],
        ];
        context.globalAlpha = opacity;
        context.fillStyle = css(fill);
        context.beginPath();
        context.moveTo(a[0], a[1]);
        context.lineTo(b[0], b[1]);
        context.lineTo(c[0], c[1]);
        context.lineTo(d[0], d[1]);
        context.closePath();
        context.fill();
        context.beginPath();
        context.moveTo(b[0], b[1]);
        context.lineTo(c[0], c[1]);
        context.lineTo(d[0], d[1]);
        context.stroke();
      }
      context.globalAlpha = 1;
    },
    dispose: () => undefined,
  };
};

export const createFloorRenderer = (canvas: HTMLCanvasElement): FloorRenderer | null => createWebGl(canvas) ?? create2d(canvas);

/** Resolve any CSS colour expression (including light-dark and color-mix) to linear RGBA in 0..1. */
export const resolveColor = (host: HTMLElement, expression: string): Rgba => {
  const probe = document.createElement('span');
  probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
  probe.style.color = expression;
  host.append(probe);
  const computed = getComputedStyle(probe).color;
  probe.remove();
  const scratch = document.createElement('canvas');
  scratch.width = 1;
  scratch.height = 1;
  const context = scratch.getContext('2d', { willReadFrequently: true });
  if (!context) return [0, 0, 0, 1];
  context.fillStyle = computed;
  context.fillRect(0, 0, 1, 1);
  const [r = 0, g = 0, b = 0, a = 255] = context.getImageData(0, 0, 1, 1).data;
  return [r / 255, g / 255, b / 255, a / 255];
};
