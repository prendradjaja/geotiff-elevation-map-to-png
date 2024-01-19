import { fromUrl, fromArrayBuffer, fromBlob } from "geotiff";
import { readFileSync, writeFileSync } from "fs";
import pngjs from "pngjs";

const PNG = pngjs.PNG;

const BLACK = 0;
const WHITE = 1;

const maxSaturation = 0.4;
const hue1 = 0;
const hue2 = 0.666666;

function parseArgs() {
  if (process.argv.length < 4) {
    console.log('Usage: node index.js INPUT_PATH OUTPUT_PATH');
    process.exit(1);
  }
  const [inputPath, outputPath] = process.argv.slice(2);
  return {inputPath, outputPath};
}

async function main() {
  const {inputPath, outputPath} = parseArgs();

  // Read input file
  const arrayBuffer = readFileSync(inputPath).buffer;
  const tiff = await fromArrayBuffer(arrayBuffer);
  const image = await tiff.getImage(); // by default, the first image is read.
  const rasters = await image.readRasters();
  const { width, height, [0]: raster } = rasters;

  // Make lightness scale
  const f = makeLinearEquationFromPoints(
    [900, BLACK],
    [1, WHITE],
  );
  const elevationToLightness = elevation =>
    elevation <= 0 // todo Check: Can it be exactly zero? (I think so: I think it's ints)
    ? 0.2
    : clamp(f(elevation), 0, 1);

  function getPartialColor(x, y) {
    const xSlope = [2, 0, toElevation(x + 1, y) - toElevation(x - 1, y)];
    const ySlope = [0, 2, toElevation(x, y + 1) - toElevation(x, y - 1)];
    const normalVector = getCrossProduct(xSlope, ySlope);

    // v points "down-slope"
    const v = get2DComponent(normalVector);

    // Except if [x, y] is on a flat surface
    if (v[0] === 0 && v[1] === 0) {
      return [0, 0];
    }

    // Use the direction of v to choose the color
    const unitVector = getUnitVector2d(v);
    if (unitVector[1] < 0) {
      return [hue1, - maxSaturation * unitVector[1]];
    } else {
      return [hue2, maxSaturation * unitVector[1]];
    }
  }

  const toIndex = (x, y) => (width * y + x) << 2;
  const toElevation = (x, y) => raster[width * y + x];

  // Create and write image
  const outputImage = new PNG({ width, height });
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = toIndex(x, y);
      const elevation = toElevation(x, y);
      const l = elevationToLightness(elevation);
      const [h, s] = getPartialColor(x, y);
      const [r, g, b] = hslToRgb(h, s, l);
      outputImage.data[idx] = r;
      outputImage.data[idx + 1] = g;
      outputImage.data[idx + 2] = b;
      outputImage.data[idx + 3] = 255;
    }
  }
  const outputBuffer = PNG.sync.write(outputImage);
  writeFileSync(outputPath, outputBuffer);
  console.log('Output image:',  outputPath);
}

function clamp(x, lo, hi) {
  if (x <= lo) {
    return lo;
  } else if (x >= hi) {
    return hi;
  } else {
    return x;
  }
}

function makeLinearEquationFromPoints(p1, p2) {
  const [x1, y1] = p1;
  const [x2, y2] = p2;
  const m = (y2 - y1) / (x2 - x1); // slope
  const b = y1 - m * x1; // y-intercept
  return x => m * x + b;
}

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from https://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 *
 * From https://stackoverflow.com/a/9493060
 */
function hslToRgb(h, s, l) {
  let r, g, b;

  if (s === 0) {
    r = g = b = l; // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hueToRgb(p, q, h + 1/3);
    g = hueToRgb(p, q, h);
    b = hueToRgb(p, q, h - 1/3);
  }

  return [
    Math.round(r * 255),
    Math.round(g * 255),
    Math.round(b * 255)
  ];
}

// From https://stackoverflow.com/a/9493060
function hueToRgb(p, q, t) {
  if (t < 0) t += 1;
  if (t > 1) t -= 1;
  if (t < 1/6) return p + (q - p) * 6 * t;
  if (t < 1/2) return q;
  if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
  return p;
}

function get2DComponent(vector3d) {
  return [vector3d[0], vector3d[1]];
}

// Get the unit vector in the same direction as the given 2D vector
function getUnitVector2d(v) {
  const magnitude = Math.sqrt(v[0]**2 + v[1]**2);
  return [v[0] / magnitude, v[1] / magnitude];
}

function getCrossProduct(a, b) {
  const [a1, a2, a3] = a;
  const [b1, b2, b3] = b;
  return [
    a2*b3 - a3*b2,
    a3*b1 - a1*b3,
    a1*b2 - a2*b1,
  ];
}

main();
