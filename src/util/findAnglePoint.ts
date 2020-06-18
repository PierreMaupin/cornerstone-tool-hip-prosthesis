export default function(
  linePoint1: { x: any; y: any },
  linePoint2: { x: any; y: any },
  point: { x: any; y: any },
) {
  const x1 = linePoint2.x
  const y1 = linePoint2.y
  const x2 = linePoint1.x
  const y2 = linePoint1.y
  const x3 = point.x
  const y3 = point.y
  const coef = (y2 - y1) / (x2 - x1)
  const B = y2 - x2 * coef
  /*console.log("coef " + coef);
    console.log("ordonnée à l'origine " + B);
    console.log(linePoint1);
    console.log(linePoint2);
    console.log(point);*/

  /*const a = { x: 6, y: -1 }
    const b = { x: 6, y: -5 }
    const c = { x: 3, y: -5 }*/
  const a = { x: 3, y: 1 }
  const b = { x: 3, y: 5 }
  const c = { x: 2, y: 5 }
  console.log(findAngle(c, b, a))
  console.log(findAngle(a, b, c))

  /*var pointy = 100*(coef) + B;
    console.log(pointy);
    return {x:100,y:pointy}*/

  var angleFind = 1000
  var x = 0
  var y = 0

  for (var _i = -10000; _i < 10000; _i++) {
    var pointy = _i * coef + B
    const p = { x: _i, y: pointy }
    const p1 = { x: linePoint2.x, y: linePoint2.y }
    var angle = findAngle(p1, p, point)
    if (angle > 2.3 && angle < 2.4) {
      //console.log("ok " + angle)
      if (
        Math.abs(angle - 2.35619) < Math.abs(angleFind - 2.35619) ||
        angleFind == 1000
      ) {
        angleFind = angle
        x = _i
        y = pointy
        //console.log("on prend la valeur")
      }
    }
  }
  console.log('on a un angle de ' + angleFind + ' ' + x + ' ' + y)
  return [{ x: x, y: y }, angleFind * (180 / Math.PI)]
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
