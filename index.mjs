import { fromUrl, fromArrayBuffer, fromBlob } from "geotiff";
import { readFileSync, writeFileSync } from "fs";
import pngjs from "pngjs";

const PNG = pngjs.PNG;

const BLACK = 0;
const WHITE = 255;

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

  // Make color scale
  const f = makeLinearEquationFromPoints(
    [900, BLACK],
    [1, WHITE],
  );
  const elevationToBrightness = elevation =>
    elevation <= 0 // todo Check: Can it be exactly zero? (I think so: I think it's ints)
    ? 50
    : clamp(f(elevation), 0, 255);

  // Create and write image
  const outputImage = new PNG({ width, height });
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (width * y + x) << 2;
      const elevation = raster[x + y * width];
      const brightness = elevationToBrightness(elevation);
      outputImage.data[idx] = brightness;
      outputImage.data[idx + 1] = brightness;
      outputImage.data[idx + 2] = brightness;
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

main();
