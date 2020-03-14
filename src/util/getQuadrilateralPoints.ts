/**
 * Get the points of the quadrilateral
 * @function getQuadrilateralPoints
 * @private
 *
 * @param data - any
 * @returns the four points of the quadrilateral
 */
export default function(data: any) {
  return Object.keys(data.handles)
    .map(key => ({
      x: data.handles[key].x,
      y: data.handles[key].y,
    }))
    .slice(0, 4)
}
