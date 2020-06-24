import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'

import findAnglePoint from '../util/findAnglePoint'
import prosthesis from '../assets/prosthesis.svg'

const path = cornerstoneTools.import('drawing/path')

export default function(
  context: any,
  element: { clientWidth: any; clientHeight: any },
  //start: { x: any; y: any },
  //end: { x: any; y: any },
  coordSystem = 'pixel',
  options: any,
  prothese: any,
  radius: any,
  middleline: any,
  centerHead: any,
) {
  if (coordSystem === 'pixel') {
    //start = cornerstone.pixelToCanvas(element, start)
    //end = cornerstone.pixelToCanvas(element, end)
    centerHead = cornerstone.pixelToCanvas(element, centerHead)
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
    /*ctx.translate(start.x, start.y)
    ctx.rotate((Math.PI / 180) * 35)
    ctx.translate(-start.x, -start.y)*/
    ctx.save()
    console.log('centrepoint en  ' + centerPoint.x + ' ' + centerPoint.y)
    //ctx.translate(centerPoint.x, centerPoint.y)

    //ctx.translate(start.x + img.width, start.y + img.height)
    //ctx.translate(start.x + 44.236 * scale * radius * 0.2, start.y + 16.131 * scale * radius * 0.2)
    ctx.translate(centerHead.x, centerHead.y)
    //ctx.translate(headx, heady)

    //const p1 = { x: start.x, y: start.y }
    //const p2 = { x: start.x, y: start.y+10 }
    //const p3 = { x: start.x+10, y: (Math.abs((start.x+10)*(-coef))+start.y+10) }

    const p1 = middleline.point1
    const p2 = middleline.point2
    const p3 = { x: middleline.point2.x, y: middleline.point1.y }
    console.log(middleline)
    var angle = 0
    if (middleline.point1.x >= middleline.point2.x) {
      angle = findAngle(p1, p2, p3)
    } else {
      angle = -findAngle(p1, p2, p3)
    }
    //const angle = 0
    console.log(angle * (180 / Math.PI))
    //ctx.rotate((Math.PI / 180) * 35) //offset
    ctx.rotate(angle)

    //ctx.translate(-(start.x + img.width), -(start.y + img.height))
    //ctx.translate(-(start.x + 44.236 * scale * radius * 0.2), -(start.y + 16.131* scale * radius * 0.2))
    ctx.translate(-centerHead.x, -centerHead.y)
    //ctx.translate(-(headx), -(heady))
    console.log('angle : ' + angle)
    console.log('radius : ' + radius)
    console.log(centerHead)
    ctx.drawImage(
      img,
      centerHead.x - 44.236 * radius * 0.2,
      centerHead.y - 16.131 * radius * 0.2,
      //headx,
      //heady,
      //0,
      //0,
      //Math.abs(img.width ),
      //Math.abs(img.height ),
      Math.abs(img.width * radius * 0.2),
      Math.abs(img.height * radius * 0.2),
    )
    //ctx.rotate(360 - (Math.PI / 180) * 35);
    ctx.restore()
    /*ctx.translate(start.x, start.y)
    ctx.rotate(end.y/10)
    ctx.translate(-start.x, -start.y)*/
  })
}

function findAngle(
  p1: { x: any; y: any },
  p2: { x: any; y: any },
  p3: { x: any; y: any },
) {
  var b = Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2),
    a = Math.pow(p2.x - p3.x, 2) + Math.pow(p2.y - p3.y, 2),
    c = Math.pow(p3.x - p1.x, 2) + Math.pow(p3.y - p1.y, 2)
  return Math.acos((a + b - c) / Math.sqrt(4 * a * b))
}
