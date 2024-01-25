import { fromUrl, fromArrayBuffer, fromBlob } from "geotiff";
import { readFileSync, writeFileSync } from "fs";

const desiredWidth = 100;
const elevationScale = 0.05;

// Hard-coded for input file at N37 W123
const CORNER_LATITUDE = 37;
const CORNER_LONGITUDE = -123;

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
      let elevation = raster[width * y + x]; // in meters
      if (elevation === undefined) {
        elevation = 0;
      } else if (elevation <= 0) {
        // elevation = -1000;
        elevation = 0;
      }
      // elevation *= 2;
      const latitude = CORNER_LATITUDE - y / (width - 1);
      const longitude = CORNER_LONGITUDE + x / (width - 1);
      // const latitude = -y / (width - 1);
      // const longitude = x / (width - 1);
      vertices[id] = latLongToXYZ(latitude, longitude, elevation);
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
  // Center the model
  const corner1 = vertices[0].slice();
  const corner2 = vertices.slice(-1)[0].slice();
  const average = [
    (corner1[0] + corner2[0]) / 2,
    (corner1[1] + corner2[1]) / 2,
    (corner1[2] + corner2[2]) / 2,
  ];
  vertices = vertices.map(
    ([x, y, z]) => [x - average[0], y - average[1], z - average[2]]
  );

  // Scale the model to a Blender-manageable size with an ad hoc scale factor
  const scaleFactor = 0.001;
  vertices = vertices.map(
    ([x, y, z]) => [x * scaleFactor, y * scaleFactor, z * scaleFactor]
  );

  // Write output
  console.log('To JSON...');
  const output = JSON.stringify({ vertices, faces });
  console.log('Writing...');
  writeFileSync(outputPath, output, 'utf8');
  console.log('Wrote to ' + outputPath);
}

// From ChatGPT. Assumes the Earth is a sphere (which is pretty reasonable: it is less than 1% wider than it is tall)
function latLongToXYZ(latitude, longitude, elevation) {
  // Earth radius in meters
  const earthRadius = 6378137;

  // Convert latitude and longitude from degrees to radians
  const latRad = latitude * (Math.PI / 180);
  const lonRad = longitude * (Math.PI / 180);

  // Calculate the XYZ position
  const x = (earthRadius + elevation) * Math.cos(latRad) * Math.cos(lonRad);
  const y = (earthRadius + elevation) * Math.cos(latRad) * Math.sin(lonRad);
  const z = (earthRadius + elevation) * Math.sin(latRad);

  return [x, y, z];
}

main();
