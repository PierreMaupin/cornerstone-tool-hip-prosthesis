import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import prosthesis from '../assets/prosthesis.svg'

const path = cornerstoneTools.import('drawing/path')

export default function(
  context: any,
  element: { clientWidth: any; clientHeight: any },
  start: { x: any; y: any },
  end: { x: any; y: any },
  coordSystem = 'pixel',
  options: any,
  prothese: any,
) {
  if (coordSystem === 'pixel') {
    start = cornerstone.pixelToCanvas(element, start)
    end = cornerstone.pixelToCanvas(element, end)
  }

  const viewport = cornerstone.getViewport(element)

  // Calculate the center of the image
  const { clientWidth: width, clientHeight: height } = element
  const { scale, translation } = viewport
  const rotation = viewport.rotation - 0.0

  const centerPoint = {
    x: width / 2 + translation.x * scale,
    y: height / 2 + translation.y * scale,
  }
  console.log()
  const img = new Image()
  img.src = prothese

  path(context, options, (ctx: any) => {
    ctx.translate(start.x, start.y)
    //ctx.rotate(end.y/10)
    ctx.rotate((Math.PI / 180) * 35)
    ctx.translate(-start.x, -start.y)
    ctx.drawImage(
      img,
      start.x,
      start.y,
      //Math.abs(img.width * (scale) * 0.05 * (start.x - end.x)),
      //Math.abs(img.height * (scale) * 0.05 * (start.x - end.x)),
      Math.abs(img.width * scale * 2),
      Math.abs(img.height * scale * 2),
    )
  })
}
