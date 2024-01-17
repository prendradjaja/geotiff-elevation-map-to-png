// Adapted from geotiff package documentation
// https://github.com/geotiffjs/geotiff.js?tab=readme-ov-file#example-usage
// Permalink: https://github.com/geotiffjs/geotiff.js/tree/61221335672ebb3fd1242252aa15c96cd5c4dacd#example-usage
function makeCoordinateConversionFunctions(image) {
  function transform(a, b, M, roundToInt = false) {
    const round = (v) => (roundToInt ? v | 0 : v);
    return [
      round(M[0] + M[1] * a + M[2] * b),
      round(M[3] + M[4] * a + M[5] * b),
    ];
  }

  const { ModelPixelScale: s, ModelTiepoint: t } = image.fileDirectory;
  let [sx, sy, sz] = s;
  let [px, py, k, gx, gy, gz] = t;
  sy = -sy; // WGS-84 tiles have a "flipped" y component

  const pixelToGPS = [gx, sx, 0, gy, 0, sy];
  const gpsToPixel = [-gx / sx, 1 / sx, 0, -gy / sy, 0, 1 / sy];

  return {
    toPixel: ([long, lat]) => transform(long, lat, gpsToPixel, true),
    toGPS: ([x, y]) => transform(x, y, pixelToGPS),
  };
}
