import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'

const path = cornerstoneTools.import('drawing/path')

export default function(
  context: any,
  element: any,
  center: any,
  radius: any,
  options: any,
  coordSystem = 'pixel',
) {
  if (coordSystem === 'pixel') {
    center = cornerstone.pixelToCanvas(element, center)
  }

  path(context, options, (ctx: any) => {
    ctx.arc(center.x, center.y, radius, 0, 2 * Math.PI)
  })
}
