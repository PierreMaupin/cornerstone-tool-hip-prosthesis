import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'

const path = cornerstoneTools.import('drawing/path')

/**
 * Draw a rectangle defined by `corner1` and `corner2`.
 * @public
 * @method drawRect
 * @memberof Drawing
 *
 * @param {CanvasRenderingContext2D} context - Target context
 * @param {HTMLElement} element - The DOM Element to draw on
 * @param {Object} corner1 - `{ x, y }` in either pixel or canvas coordinates.
 * @param {Object} corner2 - `{ x, y }` in either pixel or canvas coordinates.
 * @param corner3 - `{ x, y }` in either pixel or canvas coordinates.
 * @param corner4 - `{ x, y }` in either pixel or canvas coordinates.
 * @param {Object} options - See {@link path}
 * @param {String} [coordSystem='pixel'] - Can be "pixel" (default) or "canvas". The coordinate
 *     system of the points passed in to the function. If "pixel" then cornerstone.pixelToCanvas
 *     is used to transform the points from pixel to canvas coordinates.
 * @param {Number} initialRotation - Rectangle initial rotation
 * @returns {undefined}
 */
export default function(
  context: any,
  element: { clientWidth: any; clientHeight: any },
  corner1: { x: any; y: any },
  corner2: { x: any; y: any },
  corner3: { x: any; y: any },
  corner4: { x: any; y: any },
  options: any,
  coordSystem = 'pixel',
  initialRotation = 0.0,
) {
  if (coordSystem === 'pixel') {
    corner1 = cornerstone.pixelToCanvas(element, corner1)
    corner2 = cornerstone.pixelToCanvas(element, corner2)
    corner3 = cornerstone.pixelToCanvas(element, corner3)
    corner4 = cornerstone.pixelToCanvas(element, corner4)
  }
  const viewport = cornerstone.getViewport(element)

  // Calculate the center of the image
  const { clientWidth: width, clientHeight: height } = element
  const { scale, translation } = viewport
  const rotation = viewport.rotation - initialRotation

  const centerPoint = {
    x: width / 2 + translation.x * scale,
    y: height / 2 + translation.y * scale,
  }

  if (Math.abs(rotation) > 0.05) {
    corner1 = rotatePoint(corner1, centerPoint, -rotation)
    corner2 = rotatePoint(corner2, centerPoint, -rotation)
  }
  if (Math.abs(rotation) > 0.05) {
    corner1 = rotatePoint(corner1, centerPoint, rotation)
    corner2 = rotatePoint(corner2, centerPoint, rotation)
    corner3 = rotatePoint(corner3, centerPoint, rotation)
    corner4 = rotatePoint(corner4, centerPoint, rotation)
  }

  path(context, options, (ctx: any) => {
    ctx.moveTo(corner1.x, corner1.y)
    ctx.lineTo(corner3.x, corner3.y)
    ctx.moveTo(corner3.x, corner3.y)
    ctx.lineTo(corner2.x, corner2.y)
    ctx.moveTo(corner2.x, corner2.y)
    ctx.lineTo(corner4.x, corner4.y)
    ctx.moveTo(corner4.x, corner4.y)
    ctx.lineTo(corner1.x, corner1.y)
  })
}

/**
 * Translate a point using a rotation angle.
 * @export @public @method
 * @name rotatePoint
 *
 * @param {Object} point - `{ x, y }` in either pixel or canvas coordinates.
 * @param {Object} center - `{ x, y }` in either pixel or canvas coordinates.
 * @param {Number} angle - angle in degrees
 * @returns {Object} - `{ x, y }` new point translated
 */
export function rotatePoint(point: any, center: any, angle: number) {
  const angleRadians = angle * (Math.PI / 180) // Convert to radians

  const rotatedX =
    Math.cos(angleRadians) * (point.x - center.x) -
    Math.sin(angleRadians) * (point.y - center.y) +
    center.x

  const rotatedY =
    Math.sin(angleRadians) * (point.x - center.x) +
    Math.cos(angleRadians) * (point.y - center.y) +
    center.y

  return {
    x: rotatedX,
    y: rotatedY,
  }
}
