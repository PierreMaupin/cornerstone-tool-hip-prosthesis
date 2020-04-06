export default function(context: any, data: any) {
  const point1 = { x: 0, y: 0 }
  const point2 = { x: 0, y: 0 }
  Object.keys(data.handles).forEach(handle => {
    const point = data.handles[handle]
    if (data.handles[handle].position === 'start') {
      point1.x += point.x
      point1.y += point.y
    } else if (data.handles[handle].position === 'end') {
      point2.x += point.x
      point2.y += point.y
    }
  })
  point1.x /= 2
  point1.y /= 2
  point2.x /= 2
  point2.y /= 2

  const slope = (point2.y - point1.y) / (point2.x - point1.x)
  // y = mx + b | b = y - mx
  const intercept = point2.y - slope * point2.x

  function getY(x: any) {
    return slope * x + intercept
  }
  function getX(y: any) {
    return (y - intercept) / slope
  }

  return {
    point1: { x: getX(0), y: 0 },
    point2: { x: getX(context.canvas.height), y: context.canvas.height },
  }
}
