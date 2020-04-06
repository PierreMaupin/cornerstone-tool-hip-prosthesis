export default function(
  linePoint1: { x: any; y: any },
  linePoint2: { x: any; y: any },
  point: { x: any; y: any },
) {
  const x1 = linePoint1.x
  const y1 = linePoint1.y
  const x2 = linePoint2.x
  const y2 = linePoint2.y
  const x3 = point.x
  const y3 = point.y
  const px = x2 - x1
  const py = y2 - y1
  const dAB = px * px + py * py
  const u = ((x3 - x1) * px + (y3 - y1) * py) / dAB
  const x = x1 + u * px
  const y = y1 + u * py
  return { x, y }
}
