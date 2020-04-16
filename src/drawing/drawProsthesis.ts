import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'

const path = cornerstoneTools.import('drawing/path')

export default function(
  context: any,
  element: { clientWidth: any; clientHeight: any },
  start: { x: any; y: any },
  end: { x: any; y: any },
  coordSystem = 'pixel',
  options: any,
) {
  if (coordSystem === 'pixel') {
    start = cornerstone.pixelToCanvas(element, start)
    end = cornerstone.pixelToCanvas(element, end)
  }

  const svg = new Image()
  svg.src = 'https://svgshare.com/i/K5V.svg'

  path(context, options, (ctx: any) => {
    ctx.drawImage(
      svg,
      start.x,
      start.y,
      Math.abs(start.x - end.x),
      Math.abs(start.y - end.y),
    )
  })
}
