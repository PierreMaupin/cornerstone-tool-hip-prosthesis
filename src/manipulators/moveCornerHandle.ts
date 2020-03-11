import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import cornerstoneMath from 'cornerstone-math'
const EVENTS = cornerstoneTools.EVENTS
const triggerEvent = cornerstoneTools.import('util/triggerEvent')
const clipToBox = cornerstoneTools.import('util/clipToBox')
const BaseAnnotationTool = cornerstoneTools.import('base/BaseAnnotationTool')
import getActiveTool from '../util/getActiveTool'

export default function(
  mouseEventData: any,
  toolType: any,
  data: any,
  handle: any,
  doneMovingCallback: any,
  preventHandleOutsideImage: any,
) {
  const { image, currentPoints, element, buttons } = mouseEventData
  const distanceFromTool = {
    x: handle.x - currentPoints.image.x,
    y: handle.y - currentPoints.image.y,
  }
  const { columns } = mouseEventData.image

  function mouseDragCallback(e: any) {
    const eventData = e.detail

    if (handle.hasMoved === false) {
      handle.hasMoved = true
    }

    handle.active = true
    const { start, end, corner1, corner2 } = data.handles

    handle.x = eventData.currentPoints.image.x + distanceFromTool.x
    handle.y = eventData.currentPoints.image.y + distanceFromTool.y

    if (preventHandleOutsideImage) {
      clipToBox(handle, eventData.image)
    }

    cornerstone.updateImage(element)
    // todo
    const activeTool = getActiveTool(element, buttons, 'mouse')

    if (activeTool instanceof BaseAnnotationTool) {
      activeTool.updateCachedStats(image, element, data)
    }
    const eventType = EVENTS.MEASUREMENT_MODIFIED
    const modifiedEventData = {
      toolType,
      element,
      measurementData: data,
    }

    triggerEvent(element, eventType, modifiedEventData)
  }

  element.addEventListener(EVENTS.MOUSE_DRAG, mouseDragCallback)

  function mouseUpCallback() {
    handle.active = false
    element.removeEventListener(EVENTS.MOUSE_DRAG, mouseDragCallback)
    element.removeEventListener(EVENTS.MOUSE_UP, mouseUpCallback)
    element.removeEventListener(EVENTS.MOUSE_CLICK, mouseUpCallback)
    cornerstone.updateImage(element)

    if (typeof doneMovingCallback === 'function') {
      doneMovingCallback()
    }
  }

  element.addEventListener(EVENTS.MOUSE_UP, mouseUpCallback)
  element.addEventListener(EVENTS.MOUSE_CLICK, mouseUpCallback)
}
