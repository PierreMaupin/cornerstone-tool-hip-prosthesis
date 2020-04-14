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
 * @param {Object} point1 - `{ x, y }` in either pixel or canvas coordinates.
 * @param {Object} point2 - `{ x, y }` in either pixel or canvas coordinates.
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
  point1: { x: any; y: any },
  point2: { x: any; y: any },

  options: any,
  coordSystem = 'pixel',
  initialRotation = 0.0,
) {
  if (coordSystem === 'pixel') {
    point1 = cornerstone.pixelToCanvas(element, point1)
    point2 = cornerstone.pixelToCanvas(element, point2)
  }
  const viewport = cornerstone.getViewport(element)

  const { clientWidth: width, clientHeight: height } = element
  const { scale, translation } = viewport
  const rotation = viewport.rotation - initialRotation
  path(context, options, (ctx: any) => {
    ctx.moveTo(point1.x, point1.y)
    ctx.lineTo(point2.x, point2.y)
  })
}
