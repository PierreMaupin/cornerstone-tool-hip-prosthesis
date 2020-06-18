import cornerstone from 'cornerstone-core'
import cornerstoneTools from 'cornerstone-tools'
import { rotatedEllipticalRoiCursor } from './cursor'
import getROITextBoxCoords from './util/getROITextBoxCoords'
import calculateRotatedEllipseStatistics from './util/calculateRotatedEllipseStatistics'
import { setToolCursor } from './setToolCursor'
import drawParallelogram from './drawing/drawParallelogram'
import moveCornerHandle from './manipulators/moveCornerHandle'
import getQuadrilateralPoints from './util/getQuadrilateralPoints'
import drawLine from './drawing/drawLine'
import drawLines from './drawing/drawLines'
import drawTextBox from './drawing/drawTextBox'

//import prosthesis from './assets/prosthesis.svg'
var prosthesis = 'test.svg'
import findLine from './util/findMiddleLine'
import drawCircle from './drawing/drawCircle'
import cornerstoneMath from 'cornerstone-math'
import findPerpendicularPoint from './util/findPerpendicularPoint'
import findAnglePoint from './util/findAnglePoint'
import drawProsthesis from './drawing/drawProsthesis'

const BaseAnnotationTool = cornerstoneTools.import('base/BaseAnnotationTool')
const throttle = cornerstoneTools.import('util/throttle')
const EVENTS = cornerstoneTools.EVENTS
const getLogger = cornerstoneTools.import('util/getLogger')
const logger = getLogger('tools:annotation:RotatedEllipticalRoiTool')
const handleActivator = cornerstoneTools.import('manipulators/handleActivator')
const anyHandlesOutsideImage = cornerstoneTools.import(
  'manipulators/anyHandlesOutsideImage',
)
const getHandleNearImagePoint = cornerstoneTools.import(
  'manipulators/getHandleNearImagePoint',
)
const moveAllHandles = cornerstoneTools.import('manipulators/moveAllHandles')
const moveNewHandle = cornerstoneTools.import('manipulators/moveNewHandle')
const getPixelSpacing = cornerstoneTools.import('util/getPixelSpacing')
const getNewContext = cornerstoneTools.import('drawing/getNewContext')
const draw = cornerstoneTools.import('drawing/draw')
const setShadow = cornerstoneTools.import('drawing/setShadow')
const drawHandles = cornerstoneTools.import('drawing/drawHandles')
const drawLinkedTextBox = cornerstoneTools.import('drawing/drawLinkedTextBox')
const numbersWithCommas = cornerstoneTools.import('util/numbersWithCommas')
const calculateSUV = cornerstoneTools.import('util/calculateSUV')

export default class HipProsthesisTool extends BaseAnnotationTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'HipProsthesis',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      configuration: {
        // showMinMax: false,
        // showHounsfieldUnits: true,
      },
      svgCursor: rotatedEllipticalRoiCursor,
    }

    super(props, defaultProps)

    this.addedTools = []
    this.middleLine = null
    this.perpPoint = null
    this.perpPoint1 = null
    this.perpPoint2 = null
    this.distance = null
    this.radius = null
    this.scale = null
    this.angleCervico = null
    this.setProsthesis = false

    this.throttledUpdateCachedStats = throttle(this.updateCachedStats, 110)
  }

  public reset() {
    this.addedTools = []
    this.middleLine = null
    this.perpPoint = null
    this.perpPoint1 = null
    this.perpPoint2 = null
    this.distance = null
    this.setProsthesis = false
  }

  public addNewMeasurement(evt: any) {
    if (
      this.addedTools.includes('bille') &&
      this.addedTools.includes('circle') &&
      this.addedTools.includes('quadrilateral') &&
      this.addedTools.includes('prosthesis') &&
      this.addedTools.includes('tooltest')
    ) {
      return
    }
    const eventData = evt.detail
    const { element, image } = eventData
    const measurementData: any = this.createNewMeasurement(eventData)

    cornerstoneTools.addToolState(element, this.name, measurementData)
    const { end } = measurementData.handles

    cornerstone.updateImage(element)

    moveNewHandle(
      eventData,
      this.name,
      measurementData,
      end,
      {},
      'mouse',
      () => {
        if (anyHandlesOutsideImage(eventData, measurementData.handles)) {
          // Delete the measurement
          cornerstoneTools.removeToolState(element, this.name, measurementData)
        } else {
          if (measurementData.tool === 'quadrilateral') {
            measurementData.handles.corner1.x = measurementData.handles.start.x
            measurementData.handles.corner1.y = measurementData.handles.end.y
            measurementData.handles.corner1.position = 'end'
            measurementData.handles.corner1.isFirst = false

            measurementData.handles.corner2.x = measurementData.handles.end.x
            measurementData.handles.corner2.y = measurementData.handles.start.y
            measurementData.handles.corner2.position = 'start'
            measurementData.handles.corner2.isFirst = false
          }

          this.updateCachedStats(image, element, measurementData)
          cornerstone.triggerEvent(
            element,
            EVENTS.MEASUREMENT_COMPLETED,
            measurementData,
          )
        }
      },
    )
  }

  public createNewMeasurement(eventData: any) {
    const goodEventData =
      eventData && eventData.currentPoints && eventData.currentPoints.image

    if (!goodEventData) {
      logger.error(
        `required eventData not supplied to tool ${this.name}'s createNewMeasurement`,
      )

      return
    }
    if (!this.addedTools.includes('bille')) {
      this.addedTools.push('bille')
      return {
        tool: 'bille',
        visible: true,
        active: true,
        color: undefined,
        invalidated: true,
        handles: {
          start: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: false,
            key: 'start',
          },
          end: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: true,
            key: 'end',
          },
          textBox: {
            active: false,
            hasMoved: false,
            movesIndependently: false,
            drawnIndependently: true,
            allowedOutsideImage: true,
            hasBoundingBox: true,
          },
        },
      }
    }
    if (!this.addedTools.includes('circle')) {
      this.addedTools.push('circle')
      return {
        tool: 'circle',
        visible: true,
        active: true,
        color: undefined,
        invalidated: true,
        handles: {
          start: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: false,
            key: 'start',
          },
          end: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: true,
            key: 'end',
          },
          textBox: {
            active: false,
            hasMoved: false,
            movesIndependently: false,
            drawnIndependently: true,
            allowedOutsideImage: true,
            hasBoundingBox: true,
          },
        },
      }
    } else if (!this.addedTools.includes('quadrilateral')) {
      this.addedTools.push('quadrilateral')
      return {
        tool: 'quadrilateral',
        visible: true,
        active: true,
        color: undefined,
        invalidated: true,
        shortestDistance: 0,
        handles: {
          start: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            position: 'start',
            highlight: true,
            active: false,
            key: 'start',
          },
          end: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            position: 'end',
            highlight: true,
            active: true,
            key: 'end',
          },
          corner1: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            position: null,
            highlight: true,
            active: false,
            isFirst: true,
            key: 'corner1',
          },
          corner2: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            position: null,
            highlight: true,
            active: false,
            isFirst: true,
            key: 'corner2',
          },
          initialRotation: eventData.viewport.rotation,
          textBox: {
            active: false,
            hasMoved: false,
            movesIndependently: false,
            drawnIndependently: true,
            allowedOutsideImage: true,
            hasBoundingBox: true,
          },
        },
      }
    } else if (!this.addedTools.includes('prosthesis')) {
      this.addedTools.push('prosthesis')
      return {
        tool: 'prosthesis',
        visible: true,
        active: true,
        color: undefined,
        invalidated: true,
        handles: {
          start: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: false,
            key: 'start',
          },
          end: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: true,
            key: 'end',
          },
          textBox: {
            active: false,
            hasMoved: false,
            movesIndependently: false,
            drawnIndependently: true,
            allowedOutsideImage: true,
            hasBoundingBox: true,
          },
        },
      }
    } else if (!this.addedTools.includes('tooltest')) {
      this.addedTools.push('tooltest')
      return {
        tool: 'tooltest',
        visible: true,
        active: true,
        color: undefined,
        invalidated: true,
        handles: {
          start: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: false,
            key: 'start',
          },
          end: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            highlight: true,
            active: true,
            key: 'end',
          },
          textBox: {
            active: true,
            hasMoved: false,
            movesIndependently: true,
            drawnIndependently: true,
            allowedOutsideImage: true,
            hasBoundingBox: true,
          },
        },
      }
    }
  }

  public mouseMoveCallback(e: any) {
    const eventData = e.detail
    const { element } = eventData

    cornerstoneTools.toolCoordinates.setCoords(eventData)

    // If we have no tool data for this element, do nothing
    const toolData = cornerstoneTools.getToolState(element, this.name)

    if (!toolData) {
      return
    }

    // We have tool data, search through all data
    // And see if we can activate a handle
    let imageNeedsUpdate = false

    for (const data of toolData.data) {
      if (!(data && data.handles)) {
        break
      }
      // Get the cursor position in canvas coordinates
      const coords = eventData.currentPoints.canvas

      if (handleActivator(eventData.element, data.handles, coords) === true) {
        imageNeedsUpdate = true
      }

      if (
        (this.pointNearTool(element, data, coords) && !data.active) ||
        (!this.pointNearTool(element, data, coords) && data.active)
      ) {
        data.active = !data.active
        imageNeedsUpdate = true
      }
    }

    // Handle activation status changed, redraw the image
    if (imageNeedsUpdate) {
      cornerstone.updateImage(eventData.element)
    }
  }

  public handleSelectedCallback(e: any) {
    const eventData = e.detail
    let data: any
    const { element } = eventData

    const handleDoneMove = (handle: any) => {
      data.invalidated = true
      if (anyHandlesOutsideImage(eventData, data.handles)) {
        // Delete the measurement
        cornerstoneTools.removeToolState(element, this.name, data)
      }

      if (handle) {
        handle.moving = false
        handle.selected = true
      }

      setToolCursor(this.element, this.svgCursor)

      cornerstone.updateImage(element)
      element.addEventListener(EVENTS.MOUSE_MOVE, this.mouseMoveCallback)
      element.addEventListener(EVENTS.TOUCH_START, this._moveCallback)
    }

    const coords = eventData.startPoints.canvas
    const toolData = cornerstoneTools.getToolState(e.currentTarget, this.name)

    if (!toolData) {
      return
    }

    // Now check to see if there is a handle we can move
    for (data of toolData.data) {
      const distance = 6
      const handle = getHandleNearImagePoint(
        element,
        data.handles,
        coords,
        distance,
      )

      if (handle) {
        element.removeEventListener(EVENTS.MOUSE_MOVE, this.mouseMoveCallback)
        data.active = true
        moveCornerHandle(
          eventData,
          this.name,
          data,
          handle,
          handleDoneMove,
          true,
        )
        e.stopImmediatePropagation()
        e.stopPropagation()
        e.preventDefault()

        return
      }
    }

    // Now check to see if there is a line we can move
    // Now check to see if we have a tool that we can move
    if (!this.pointNearTool) {
      return
    }

    const opt = {
      deleteIfHandleOutsideImage: true,
      preventHandleOutsideImage: false,
    }

    for (data of toolData.data) {
      data.active = false
      if (this.pointNearTool(element, data, coords)) {
        data.active = true
        element.removeEventListener(EVENTS.MOUSE_MOVE, this.mouseMoveCallback)
        moveAllHandles(e, data, toolData, this.name, opt, handleDoneMove)
        e.stopImmediatePropagation()
        e.stopPropagation()
        e.preventDefault()

        return
      }
    }
  }

  public pointNearTool(
    element: any,
    data: any,
    coords: any,
    interactionType: any = 'mouse',
  ) {
    const validParameters =
      data && data.handles && data.handles.start && data.handles.end

    if (!validParameters) {
      logger.warn(
        `invalid parameters supplied to tool ${this.name}'s pointNearTool`,
      )
    }

    if (!validParameters || !data.visible) {
      return false
    }

    const distance = interactionType === 'mouse' ? 15 : 25
    const points = getQuadrilateralPoints(data)
    for (const point of points) {
      const handle = cornerstone.pixelToCanvas(element, point)
      const delta = {
        x: handle.x - coords.x,
        y: handle.y - coords.y,
      }
      const dist = Math.sqrt(delta.x * delta.x + delta.y * delta.y)
      if (dist <= distance) {
        return handle
      }
    }
    return false
  }

  public updateCachedStats(image: any, element: HTMLElement, data: any) {
    const seriesModule =
      cornerstone.metaData.get('generalSeriesModule', image.imageId) || {}
    const modality = seriesModule.modality
    const pixelSpacing = getPixelSpacing(image)

    const points = getQuadrilateralPoints(data)

    data.invalidated = false
  }

  public renderToolData(evt: any) {
    const toolData = cornerstoneTools.getToolState(evt.currentTarget, this.name)

    if (!toolData) {
      return
    }

    const eventData = evt.detail
    const { image, element } = eventData
    const lineWidth = cornerstoneTools.toolStyle.getToolWidth()
    const { handleRadius, drawHandlesOnHover } = this.configuration
    const context = getNewContext(eventData.canvasContext.canvas)
    const { rowPixelSpacing, colPixelSpacing } = getPixelSpacing(image)

    // Meta
    const seriesModule =
      cornerstone.metaData.get('generalSeriesModule', image.imageId) || {}

    // Pixel Spacing
    const modality = seriesModule.modality
    const hasPixelSpacing = rowPixelSpacing && colPixelSpacing

    draw(context, (ctx: any) => {
      // If we have tool data for this element - iterate over each set and draw it
      for (const data of toolData.data) {
        if (!data.visible) {
          continue
        }
        // Configure
        const color = cornerstoneTools.toolColors.getColorIfActive(data)
        const handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
        }

        setShadow(ctx, this.configuration)
        // first we set the scale
        if (data.tool === 'bille') {
          const getDistance = cornerstoneMath.point.distance

          const startCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.start,
          )

          const endCanvas = cornerstone.pixelToCanvas(element, data.handles.end)

          // Calculating the radius where startCanvas is the center of the circle to be drawn
          const radius = getDistance(startCanvas, endCanvas)
          this.scale = radius
          // Draw Circle
          drawCircle(
            context,
            element,
            data.handles.start,
            radius,
            {
              color,
            },
            'pixel',
          )
        }
        // then we draw the head
        if (data.tool === 'circle') {
          const getDistance = cornerstoneMath.point.distance

          const startCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.start,
          )

          const endCanvas = cornerstone.pixelToCanvas(element, data.handles.end)

          // Calculating the radius where startCanvas is the center of the circle to be drawn
          const radius = getDistance(startCanvas, endCanvas)
          this.radius = radius
          // Draw Circle
          drawCircle(
            context,
            element,
            data.handles.start,
            radius,
            {
              color,
            },
            'pixel',
          )
        } else if (data.tool === 'quadrilateral') {
          // Draw
          drawParallelogram(
            ctx,
            element,
            data.handles.start,
            data.handles.end,
            data.handles.corner1,
            data.handles.corner2,
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
          this.middleLine = findLine(context, data)
          drawLine(
            ctx,
            element,
            this.middleLine.point1,
            this.middleLine.point2,
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
          this.setProsthesis = true
        } else if (data.tool === 'tooltest') {
          this.perpPoint1 = findPerpendicularPoint(
            this.middleLine.point1,
            this.middleLine.point2,
            data.handles.start,
          )
          this.perpPoint2 = findPerpendicularPoint(
            this.middleLine.point1,
            this.middleLine.point2,
            data.handles.end,
          )
          //this.distance = Math.sqrt(Math.pow(data.handles.start.x-data.handles.end.x,2) + Math.pow(data.handles.start.y-data.handles.end.y,2))
          this.distance = Math.sqrt(
            Math.pow(this.perpPoint2.x - this.perpPoint1.x, 2) +
              Math.pow(this.perpPoint2.y - this.perpPoint1.y, 2),
          )
          drawLine(
            ctx,
            element,
            data.handles.start,
            this.perpPoint1,
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
          drawLine(
            ctx,
            element,
            data.handles.end,
            this.perpPoint2,
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
          const dist = data.handles.end.y - data.handles.start.y
          const text = dist.toString()
          /*drawTextBox(
            context,
            text,
            data.handles.end.x,
            data.handles.end.y,
            color,
            options
          );*/
        }

        // in case we have quadrilateral and circle
        if (
          //this.addedTools.includes('quadrilateral')
          this.setProsthesis == true
        ) {
          const toolsData = cornerstoneTools.getToolState(element, this.name)
          this.perpPoint = findPerpendicularPoint(
            this.middleLine.point1,
            this.middleLine.point2,
            toolsData.data[1].handles.start,
          )

          this.anglePoint = findAnglePoint(
            this.middleLine.point1,
            this.middleLine.point2,
            toolsData.data[1].handles.start,
          )
          console.log(
            'le centre est en ' +
              toolsData.data[1].handles.start.x +
              ' ' +
              toolsData.data[1].handles.start.y,
          )
          console.log(this.anglePoint)
          console.log(ctx)
          console.log('distance ' + this.distance)
          drawLines(
            ctx,
            element,
            toolsData.data[1].handles.start,
            this.perpPoint,
            this.anglePoint[0],
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
        }

        if (data.tool === 'prosthesis') {
          //console.log(this.scale);
          const coef =
            (this.middleLine.point2.y - this.middleLine.point1.y) /
            (this.middleLine.point2.x - this.middleLine.point1.x)
          console.log(coef)
          drawProsthesis(
            ctx,
            element,
            data.handles.start,
            data.handles.end,
            'pixel',
            { color },
            prosthesis,
            this.scale,
            coef,
          )
        }

        drawHandles(ctx, eventData, data.handles, handleOptions)

        // Update textbox stats
        if (data.invalidated) {
          if (data.cachedStats) {
            this.throttledUpdateCachedStats(image, element, data)
          } else {
            this.updateCachedStats(image, element, data)
          }
        }

        if (data.handles.textBox != null) {
          // Default to textbox on right side of ROI
          if (!data.handles.textBox.hasMoved) {
            const defaultCoords = getROITextBoxCoords(
              eventData.viewport,
              data.handles,
            )

            Object.assign(data.handles.textBox, defaultCoords)
          }

          const textBoxAnchorPoints = (handles: any) =>
            _findTextBoxAnchorPoints(handles)
          const textBoxContent = _createTextBoxContent(
            ctx,
            image.color,
            data.cachedStats,
            modality,
            hasPixelSpacing,
            this.configuration,
          )

          drawLinkedTextBox(
            ctx,
            element,
            data.handles.textBox,
            textBoxContent,
            data.handles,
            textBoxAnchorPoints,
            color,
            lineWidth,
            10,
            true,
          )
        }
      }
    })
  }
}

/**
 *
 *
 * @param {*} handles
 * @returns {Array.<{x: number, y: number}>}
 */
function _findTextBoxAnchorPoints(handles: any) {
  // Retrieve the bounds of the ellipse (left, top, width, and height)
  return [
    {
      x: handles.start.x,
      y: handles.start.y,
    },
    {
      x: handles.end.x,
      y: handles.end.y,
    },
    {
      x: handles.corner1.x,
      y: handles.corner1.y,
    },
    {
      x: handles.corner2.x,
      y: handles.corner2.y,
    },
  ]
}

/**
 *
 *
 * @param {*} context
 * @param {*} isColorImage
 * @param {*} statistics { area, mean, stdDev, min, max, meanStdDevSUV }
 * @param {*} modality
 * @param {*} hasPixelSpacing
 * @param {*} [options={}] - { showMinMax, showHounsfieldUnits }
 * @returns {string[]}
 */
function _createTextBoxContent(
  context: any,
  isColorImage: any,
  statistics: any = {},
  modality: any,
  hasPixelSpacing: any,
  options: any = {},
) {
  //console.log("testdeversion");
  const { area, mean, stdDev, min, max, meanStdDevSUV } = statistics
  const showMinMax = options.showMinMax || false
  const showHounsfieldUnits = options.showHounsfieldUnits !== false
  const textLines: any[] = []

  // Don't display mean/standardDev for color images
  const otherLines = []

  if (!isColorImage) {
    const hasStandardUptakeValues = meanStdDevSUV && meanStdDevSUV.mean !== 0
    const suffix = modality === 'CT' && showHounsfieldUnits ? ' HU' : ''

    let meanString = ``
    const stdDevString = ``

    // If this image has SUV values to display, concatenate them to the text line
    if (hasStandardUptakeValues) {
      const SUVtext = ' SUV: '

      const meanSuvString = ``
      const stdDevSuvString = ``

      const targetStringLength = Math.floor(
        context.measureText(`${stdDevString}     `).width,
      )

      while (context.measureText(meanString).width < targetStringLength) {
        meanString += ' '
      }

      otherLines.push(`${meanString}${meanSuvString}`)
      otherLines.push(`${stdDevString}     ${stdDevSuvString}`)
    } else {
      otherLines.push(`${meanString}     ${stdDevString}`)
    }

    if (showMinMax) {
      let minString = `Min: ${min}${suffix}`
      const maxString = `Max: ${max}${suffix}`
      const targetStringLength = hasStandardUptakeValues
        ? Math.floor(context.measureText(`${stdDevString}     `).width)
        : Math.floor(context.measureText(`${meanString}     `).width)

      while (context.measureText(minString).width < targetStringLength) {
        minString += ' '
      }

      otherLines.push(`${minString}${maxString}`)
    }
  }

  // textLines.push(_formatArea(area, hasPixelSpacing))
  otherLines.forEach(x => textLines.push(x))

  return textLines
}

/**
 *
 *
 * @param {*} area
 * @param {*} hasPixelSpacing
 * @returns {string} The formatted label for showing area
 */
function _formatArea(area: number, hasPixelSpacing: any) {
  // This uses Char code 178 for a superscript 2
  const suffix = hasPixelSpacing
    ? ` mm${String.fromCharCode(178)}`
    : ` px${String.fromCharCode(178)}`

  return `Area: ${numbersWithCommas(area.toFixed(2))}${suffix}`
}

/**
 *
 *
 * @param {*} image
 * @param {*} element
 * @param {*} handles
 * @param {*} modality
 * @param {*} pixelSpacing
 * @returns {Object} The Stats object
 */
function _calculateStats(
  image: any,
  element: HTMLElement,
  handles: any,
  modality: any,
  pixelSpacing: any,
) {
  // Retrieve the bounds of the ellipse in image coordinates
  if (handles.perpendicularPoint.isFirst) {
    return {
      area: 0,
      count: 0,
      mean: 0,
      variance: 0,
      stdDev: 0,
      min: 0,
      max: 0,
      meanStdDevSUV: 0,
    }
  }
  const ellipseCoordinates: any = _getEllipseImageCoordinates(
    handles.start,
    handles.end,
  )
  const center = getCenter(handles)
  const square = (x: any) => x * x
  const xRadius =
    Math.sqrt(
      square(handles.start.x - handles.end.x) +
        square(handles.start.y - handles.end.y),
    ) / 2
  const yRadius = Math.sqrt(
    square(handles.perpendicularPoint.x - center.x) +
      square(handles.perpendicularPoint.y - center.y),
  )
  const theta = Math.atan2(
    handles.end.y - handles.start.y,
    handles.end.x - handles.start.x,
  )

  ellipseCoordinates.xRadius = xRadius
  ellipseCoordinates.yRadius = yRadius
  ellipseCoordinates.center = center

  // Retrieve the array of pixels that the ellipse bounds cover
  const pixels = cornerstone.getPixels(
    element,
    ellipseCoordinates.left,
    ellipseCoordinates.top,
    ellipseCoordinates.width,
    ellipseCoordinates.height,
  )

  // Calculate the mean & standard deviation from the pixels and the ellipse details.
  const ellipseMeanStdDev = calculateRotatedEllipseStatistics(
    pixels,
    ellipseCoordinates,
    theta,
  )

  let meanStdDevSUV

  if (modality === 'PT') {
    meanStdDevSUV = {
      mean: calculateSUV(image, ellipseMeanStdDev.mean, true) || 0,
      stdDev: calculateSUV(image, ellipseMeanStdDev.stdDev, true) || 0,
    }
  }

  // Calculate the image area from the ellipse dimensions and pixel spacing
  const transformedHalfWidth =
    Math.abs(center.x - handles.start.x) * (pixelSpacing.colPixelSpacing || 1)
  const transformedHalfHeight =
    Math.abs(center.y - handles.start.y) * (pixelSpacing.rowPixelSpacing || 1)
  const transformedHalfLongestDistance = Math.sqrt(
    square(transformedHalfWidth) + square(transformedHalfHeight),
  )

  const transformedPerpendicularWidth =
    Math.abs(center.x - handles.perpendicularPoint.x) *
    (pixelSpacing.colPixelSpacing || 1)
  const transformedPerpendicularHeight =
    Math.abs(center.y - handles.perpendicularPoint.y) *
    (pixelSpacing.rowPixelSpacing || 1)
  const transformedHalfShortestDistance = Math.sqrt(
    square(transformedPerpendicularWidth) +
      square(transformedPerpendicularHeight),
  )
  const area =
    Math.PI * transformedHalfLongestDistance * transformedHalfShortestDistance

  return {
    area: area || 0,
    count: ellipseMeanStdDev.count || 0,
    mean: ellipseMeanStdDev.mean || 0,
    variance: ellipseMeanStdDev.variance || 0,
    stdDev: ellipseMeanStdDev.stdDev || 0,
    min: ellipseMeanStdDev.min || 0,
    max: ellipseMeanStdDev.max || 0,
    meanStdDevSUV,
  }
}

/**
 * Retrieve the bounds of the ellipse in image coordinates
 *
 * @param {*} startHandle
 * @param {*} endHandle
 * @returns {{ left: number, top: number, width: number, height: number }}
 */
function _getEllipseImageCoordinates(startHandle: any, endHandle: any) {
  return {
    left: Math.round(Math.min(startHandle.x, endHandle.x)),
    top: Math.round(Math.min(startHandle.y, endHandle.y)),
    width: Math.round(Math.abs(startHandle.x - endHandle.x)),
    height: Math.round(Math.abs(startHandle.y - endHandle.y)),
  }
}

const getCenter = (handles: any) => {
  const { start, end } = handles
  const w = Math.abs(start.x - end.x)
  const h = Math.abs(start.y - end.y)
  const xMin = Math.min(start.x, end.x)
  const yMin = Math.min(start.y, end.y)

  return {
    x: xMin + w / 2,
    y: yMin + h / 2,
  }
}
