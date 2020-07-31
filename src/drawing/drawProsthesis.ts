import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'

import findAnglePoint from '../util/findAnglePoint'
import prosthesis from '../assets/prosthesis.svg'
import drawCircle from './drawCircle'

const path = cornerstoneTools.import('drawing/path')

export default function(
  context: any,
  element: { clientWidth: any; clientHeight: any },
  //start: { x: any; y: any },
  //end: { x: any; y: any },
  coordSystem = 'pixel',
  options: any,
  prothese: any,
  side: any,
  radius: any,
  rapport: any,
  middleline: any,
  line: any,
  coord: any,
  centerHead: any,
  pluscenter: any,
  moinscenter: any,
  rotcenter: any,
  sizeProsthesis: any,
  angleProsthesis: any,
  sizeBille: any,
  type: any,
  tete: any,
  tetePos: any,
  teteNeg: any,
  diamTete: any,
) {
  const x = coord
  if (coordSystem === 'pixel') {
    //start = cornerstone.pixelToCanvas(element, start)
    //end = cornerstone.pixelToCanvas(element, end)
    coord = cornerstone.pixelToCanvas(element, coord)
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
  if (side == 'droit') {
    img.src = prothese.droit
  } else {
    img.src = prothese.gauche
  }

  var len = 0
  var wid = 0
  path(context, { color: 'rgb(0,0,0)' }, (ctx: any) => {
    ctx.save()
    console.log('centrepoint en  ' + centerPoint.x + ' ' + centerPoint.y)
    ctx.translate(coord.x, coord.y)

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

    const p4 = line.point1
    const p5 = line.point2
    const p6 = { x: line.point2.x, y: line.point1.y }
    console.log(line)
    if (line.point1.x >= line.point2.x) {
      angle = angle + findAngle(p4, p5, p6) * -0.25
    } else {
      angle = angle - findAngle(p4, p5, p6) * -0.25
    }
    //const angle = 0
    console.log(angle * (180 / Math.PI))
    ctx.rotate((Math.PI / 180) * angleProsthesis) //offset
    ctx.rotate(angle)
    ctx.translate(-coord.x, -coord.y)
    console.log('angle : ' + angle)
    console.log('radius : ' + radius)
    console.log(radius)
    const longueur = Math.abs(sizeProsthesis.l / rapport)
    const largeur = Math.abs(sizeProsthesis.w / rapport)

    const longueurCentre = coord.x - (rotcenter.x / sizeProsthesis.l) * longueur
    const largeurCentre = coord.y - (rotcenter.y / sizeProsthesis.w) * largeur

    console.log(longueurCentre + ' ' + largeurCentre)
    ctx.drawImage(img, longueurCentre, largeurCentre, longueur, largeur)

    console.log(options)
    if (type == 'tige') {
      console.log('tete ' + tete)
      if (tetePos == 'centre') {
        len = longueurCentre + (pluscenter.x / sizeProsthesis.l) * longueur
        wid = largeurCentre + (pluscenter.y / sizeProsthesis.w) * largeur
        const rayon = diamTete / (2 * rapport)
        ctx.arc(len, wid, rayon, 0, 2 * Math.PI)
      }
      if (teteNeg == 'centre') {
        len = longueurCentre + (moinscenter.x / sizeProsthesis.l) * longueur
        wid = largeurCentre + (moinscenter.y / sizeProsthesis.w) * largeur
        const rayon = diamTete / (2 * rapport)
        ctx.arc(len, wid, rayon, 0, 2 * Math.PI)
      }
      if (tete == 'centre') {
        len = longueurCentre + (centerHead.x / sizeProsthesis.l) * longueur
        wid = largeurCentre + (centerHead.y / sizeProsthesis.w) * largeur
        const rayon = diamTete / (2 * rapport)
        ctx.arc(len, wid, rayon, 0, 2 * Math.PI)
      }
    }
    ctx.restore()
  })

  return { x: len, y: wid }
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
