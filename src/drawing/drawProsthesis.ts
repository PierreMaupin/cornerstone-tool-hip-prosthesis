import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'

const path = cornerstoneTools.import('drawing/path')

export default function(
  context: any,
  element: { clientWidth: any; clientHeight: any },
  coordSystem = 'pixel',
  options: any,

  coords: { tete: { x: any; y: any }; tige: { x: any; y: any } },
) {
  if (coordSystem === 'pixel') {
    coords.tete.x = cornerstone.pixelToCanvas(element, coords.tete.x)
    coords.tete.y = cornerstone.pixelToCanvas(element, coords.tete.y)

    coords.tige.x = cornerstone.pixelToCanvas(element, coords.tige.x)
    coords.tige.y = cornerstone.pixelToCanvas(element, coords.tige.y)
  }

  const svg = new Image()
  svg.src = 'https://svgshare.com/i/K5V.svg'

  const viewport = cornerstone.getViewport(element)
  const { clientWidth: width, clientHeight: height } = element
  const { scale, translation } = viewport
  path(context, options, (ctx: any) => {
    ctx.drawImage(svg, 0, 0)
  })
}
