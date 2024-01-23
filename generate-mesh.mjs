import { fromUrl, fromArrayBuffer, fromBlob } from "geotiff";
import { readFileSync, writeFileSync } from "fs";

const desiredWidth = 100;
const elevationScale = 0.05;

function parseArgs() {
  if (process.argv.length < 4) {
    console.log('Usage: node generate-mesh.mjs INPUT_PATH OUTPUT_PATH');
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

  console.log('Creating vertices...');
  const getVertexId = (x, y) => width * y + x;
  const getVertex = (x, y) => vertices[width * y + x];
  let vertices = [];
  let id = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let z = raster[width * y + x];
      if (z === undefined) {
        z = 0;
      } else if (z < 0) {
        z = 0;
      }
      z = elevationScale * z;
      vertices[id] = [x, y, z];
      id++;
    }
  }

  console.log('Creating faces...');
  const faces = [];
  for (let y = 0; y < height - 1; y++) {
    for (let x = 0; x < width - 1; x++) {
      // A B
      // D C
      const a = getVertexId(x, y);
      const b = getVertexId(x, y + 1);
      const c = getVertexId(x + 1, y + 1);
      const d = getVertexId(x + 1, y);
      faces.push([a, b, d]);
      faces.push([b, c, d]);
    }
  }

  console.log('Various coordinate transformations...');
  // Center the model on the origin
  const dx = Math.floor(width / 2);
  const dy = Math.floor(height / 2);
  vertices = vertices.map(
    ([x, y, z]) => [x - dx, y - dy, z]
  );

  // Scale the model to the desired dimensions
  const scaleFactor = desiredWidth / width;
  vertices = vertices.map(
    ([x, y, z]) => [x * scaleFactor, y * scaleFactor, z * scaleFactor]
  );

  // Flip Y axis
  vertices = vertices.map(
    ([x, y, z]) => [x, -y, z]
  );

  // Write output
  console.log('To JSON...');
  const output = JSON.stringify({ vertices, faces });
  console.log('Writing...');
  writeFileSync(outputPath, output, 'utf8');
  console.log('Wrote to ' + outputPath);
}

main();
