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
import findLine from './util/findMiddleLine'
import drawCircle from './drawing/drawCircle'
import drawArc from './drawing/drawArc'
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
        sideFace: false,
        sideProfil: false,
        pathTige: '',
        pathCotyle: '',
        pathTigeDroit: '',
        pathCotyleDroit: '',
        colorTool1Actif: '',
        colorTool1NonActif: '',
        colorTool2Actif: '',
        colorTool2NonActif: '',
        colorTool3Actif: '',
        colorTool3NonActif: '',
        colorTool4: '',
        colorTool5: '',
        prosthesisHeadCenter: '',
        prosthesisplusCenter: '',
        prosthesismoinsCenter: '',
        prosthesisRotCenter: '',
        prosthesisSize: '',
        prosthesisAngle: '',
        billeSize: '',
        lockTige: '',
        tete: '',
        tetePos: '',
        teteNeg: '',
        diamTete: '',
      },
      svgCursor: rotatedEllipticalRoiCursor,
    }

    super(props, defaultProps)

    this.addedTools = []
    this.middleLine = null
    this.headCenter = null
    this.perpPoint = null
    this.perpPoint1 = null
    this.perpPoint2 = null
    this.anglePoint = null
    this.rapport = null
    this.distance = null
    this.distanceCentre = null
    this.lateralisation = null
    this.hauteur = null
    this.rayonPx = null
    this.radius = null
    this.scale = null
    this.side = 'droit'
    this.angleCervico = null
    this.setProsthesis = false
    this.prosthesis = null
    this.cotyle = null
    console.log(this._configuration.sideFace)
    this.sideFace = this._configuration.sideFace
    this.sideProfil = this._configuration.sideProfil
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
      //this.addedTools.includes('prosthesis') &&
      //this.addedTools.includes('cotyle') &&
      (this.addedTools.includes('hauteurTemoin') || this.sideFace == false) &&
      (this.addedTools.includes('hauteurJambe') || this.sideFace == false)
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
          if (measurementData.tool === 'circle') {
            measurementData.handles.rot.x = measurementData.handles.start.x
            measurementData.handles.rot.y = measurementData.handles.start.y
            measurementData.handles.rot.isFirst = false
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
    /*Les outils sont un à un ajouté dans le tableau d'outils dans le state du composant */
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
    } else if (
      !this.addedTools.includes('hauteurTemoin') &&
      this.sideFace == true
    ) {
      this.addedTools.push('hauteurTemoin')
      return {
        tool: 'hauteurTemoin',
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
    } else if (
      !this.addedTools.includes('hauteurJambe') &&
      this.sideFace == true
    ) {
      this.addedTools.push('hauteurJambe')
      return {
        tool: 'hauteurJambe',
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
          rot: {
            x: eventData.currentPoints.image.x,
            y: eventData.currentPoints.image.y,
            position: null,
            highlight: true,
            active: false,
            isFirst: true,
            key: 'corner1',
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
          centerTige: {
            x: this.headCenter.x,
            y: this.headCenter.y,
            position: null,
            highlight: true,
            active: false,
            isFirst: true,
            key: 'corner1',
          },
          rotTige: {
            x: this.headCenter.x,
            y: this.headCenter.y + 40,
            position: null,
            highlight: true,
            active: false,
            isFirst: true,
            key: 'corner1',
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
    const validParameters = data && data.handles && data.handles.start

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
        var color = cornerstoneTools.toolColors.getColorIfActive(data)
        var handleOptions = {
          color,
          handleRadius,
          drawHandlesIfActive: drawHandlesOnHover,
        }

        setShadow(ctx, this.configuration)
        // first we set the scale
        if (data.tool === 'bille') {
          //tool color red
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool1NonActif,
          )
          cornerstoneTools.toolColors.setActiveColor(
            this._configuration.colorTool1Actif,
          )
          color = cornerstoneTools.toolColors.getColorIfActive(data)
          handleOptions = {
            color,
            handleRadius,
            drawHandlesIfActive: drawHandlesOnHover,
          }
          const getDistance = cornerstoneMath.point.distance
          const startCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.start,
          )

          const endCanvas = cornerstone.pixelToCanvas(element, data.handles.end)

          // Calculating the radius where startCanvas is the center of the circle to be drawn
          const radius = getDistance(startCanvas, endCanvas)
          this.scale = radius
          this.rapport = this._configuration.billeSize / (radius * 2)
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
          this.headCenter = data.handles.start
          //tool color white
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool2NonActif,
          )
          cornerstoneTools.toolColors.setActiveColor(
            this._configuration.colorTool2Actif,
          )
          color = cornerstoneTools.toolColors.getColorIfActive(data)
          handleOptions = {
            color,
            handleRadius,
            drawHandlesIfActive: drawHandlesOnHover,
          }

          const getDistance = cornerstoneMath.point.distance
          const startCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.start,
          )
          const endCanvas = cornerstone.pixelToCanvas(element, data.handles.end)

          // Calculating the radius where startCanvas is the center of the circle to be drawn
          const radius = getDistance(startCanvas, endCanvas)
          console.log('info radius px' + radius)
          this.rayonPx = radius
          this.radius = radius * this.rapport
          console.log('info rayon' + this.radius)
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

          this.cotyle = {
            gauche: this._configuration.pathCotyle,
            droit: this._configuration.pathCotyleDroit,
          }
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool4,
          )
          const toolsData = cornerstoneTools.getToolState(element, this.name)
          const centerHead = {
            x: toolsData.data[3].handles.start.x,
            y: toolsData.data[3].handles.start.y,
          }
          console.log(toolsData.data[3].handles)
          //dessine la troisieme poignée et la repositionne à chaque update pour qu'elle colle au cercle
          if (
            getDistance(
              toolsData.data[3].handles.start,
              toolsData.data[3].handles.rot,
            ) >=
              getDistance(
                toolsData.data[3].handles.start,
                toolsData.data[3].handles.end,
              ) &&
            toolsData.data[4]
          ) {
            const coef =
              (toolsData.data[3].handles.rot.y -
                toolsData.data[3].handles.start.y) /
              (toolsData.data[3].handles.rot.x -
                toolsData.data[3].handles.start.x)
            console.log('coef cercle ' + coef)
            const diffx =
              toolsData.data[3].handles.rot.x -
              toolsData.data[3].handles.start.x -
              getDistance(
                toolsData.data[3].handles.start,
                toolsData.data[3].handles.end,
              )
            var i = 0
            if (
              toolsData.data[3].handles.start.x <
              toolsData.data[3].handles.rot.x
            ) {
              while (
                i < 1000 &&
                getDistance(
                  toolsData.data[3].handles.start,
                  toolsData.data[3].handles.rot,
                ) >=
                  getDistance(
                    toolsData.data[3].handles.start,
                    toolsData.data[3].handles.end,
                  )
              ) {
                toolsData.data[3].handles.rot.x =
                  toolsData.data[3].handles.rot.x - 1
                i++
              }
            } else {
              while (
                i < 1000 &&
                getDistance(
                  toolsData.data[3].handles.start,
                  toolsData.data[3].handles.rot,
                ) >=
                  getDistance(
                    toolsData.data[3].handles.start,
                    toolsData.data[3].handles.end,
                  )
              ) {
                toolsData.data[3].handles.rot.x =
                  toolsData.data[3].handles.rot.x + 1
                i++
              }
            }
          }

          if (
            getDistance(
              toolsData.data[3].handles.start,
              toolsData.data[3].handles.rot,
            ) <=
              getDistance(
                toolsData.data[3].handles.start,
                toolsData.data[3].handles.end,
              ) &&
            toolsData.data[4]
          ) {
            var i = 0
            if (
              toolsData.data[3].handles.start.x >
              toolsData.data[3].handles.rot.x
            ) {
              while (
                i < 1000 &&
                getDistance(
                  toolsData.data[3].handles.start,
                  toolsData.data[3].handles.rot,
                ) <=
                  getDistance(
                    toolsData.data[3].handles.start,
                    toolsData.data[3].handles.end,
                  )
              ) {
                toolsData.data[3].handles.rot.x =
                  toolsData.data[3].handles.rot.x - 1
                i++
              }
            } else {
              while (
                i < 1000 &&
                getDistance(
                  toolsData.data[3].handles.start,
                  toolsData.data[3].handles.rot,
                ) <=
                  getDistance(
                    toolsData.data[3].handles.start,
                    toolsData.data[3].handles.end,
                  )
              ) {
                toolsData.data[3].handles.rot.x =
                  toolsData.data[3].handles.rot.x + 1
                i++
              }
            }
          }
          //la rotation est calculée avec le centre du cercle et la troisième poignée
          var rot = {
            point1: {
              x: toolsData.data[3].handles.start.x,
              y: toolsData.data[3].handles.start.y,
            },
            point2: {
              x: toolsData.data[3].handles.rot.x,
              y: toolsData.data[3].handles.rot.y,
            },
          }
          if (!toolsData.data[4]) {
            rot = {
              point1: {
                x: 0,
                y: 0,
              },
              point2: {
                x: -100,
                y: 1,
              },
            }
          }
          const line = {
            point1: { x: 0, y: 0 },
            point2: { x: 0, y: 100 },
          }
          //dessin du cotyle
          drawProsthesis(
            ctx,
            element,
            'pixel',
            { color },
            this.cotyle,
            this.side,
            this.scale,
            this.rapport,
            rot,
            line,
            data.handles.start,
            this._configuration.prosthesisHeadCenter,
            this._configuration.prosthesisplusCenter,
            this._configuration.prosthesismoinsCenter,
            this._configuration.prosthesisRotCenter,
            this._configuration.prosthesisSize,
            this._configuration.prosthesisAngle,
            this._configuration.billeSize,
            'cotyle',
            this._configuration.tete,
            this._configuration.tetePos,
            this._configuration.teteNeg,
            this._configuration.diamTete,
          )
        } else if (data.tool === 'quadrilateral') {
          //tool color white
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool2NonActif,
          )
          cornerstoneTools.toolColors.setActiveColor(
            this._configuration.colorTool2Actif,
          )
          color = cornerstoneTools.toolColors.getColorIfActive(data)
          handleOptions = {
            color,
            handleRadius,
            drawHandlesIfActive: drawHandlesOnHover,
          }
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
          //dessin de l'axe du fémur avec le millieur des côté du parrallèlograme
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
          console.log(this.middleLine)
          if (this.middleLine.point1.x >= this.middleLine.point2.x) {
            this.side = 'droit'
            console.log('droite')
          } else {
            this.side = 'gauche'
            console.log('gauche')
          }
          this.setProsthesis = true
        } else if (data.tool === 'hauteurTemoin' && this.sideFace == true) {
          //tool color orange
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool3NonActif,
          )
          cornerstoneTools.toolColors.setActiveColor(
            this._configuration.colorTool3Actif,
          )
          color = cornerstoneTools.toolColors.getColorIfActive(data)
          handleOptions = {
            color,
            handleRadius,
            drawHandlesIfActive: drawHandlesOnHover,
          }
          drawLine(
            ctx,
            element,
            data.handles.start,
            data.handles.end,
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
        } else if (data.tool === 'hauteurJambe' && this.sideFace == true) {
          //tool color orange
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool3NonActif,
          )
          color = cornerstoneTools.toolColors.getColorIfActive(data)
          handleOptions = {
            color,
            handleRadius,
            drawHandlesIfActive: drawHandlesOnHover,
          }
          const toolsData = cornerstoneTools.getToolState(element, this.name)

          const start = {
            x: toolsData.data[1].handles.start.x,
            y: toolsData.data[1].handles.start.y,
          }
          const end = {
            x: toolsData.data[1].handles.end.x,
            y: toolsData.data[1].handles.end.y,
          }
          //console.log(toolsData.data[3]);
          const coef: number = (start.y - end.y) / (start.x - end.x)

          const p1 = {
            x: data.handles.start.x + 1000,
            y: data.handles.start.y + 1000 * coef,
          }
          const p2 = {
            x: data.handles.end.x - 1000,
            y: data.handles.end.y - 1000 * coef,
          }
          this.perpPoint1 = findPerpendicularPoint(
            data.handles.end,
            p2,
            data.handles.start,
          )

          const getDistance = cornerstoneMath.point.distance

          const startCanvas = cornerstone.pixelToCanvas(
            element,
            data.handles.start,
          )
          const endCanvas = cornerstone.pixelToCanvas(element, this.perpPoint1)

          console.log('info hauteur px ' + getDistance(startCanvas, endCanvas))
          this.hauteur = getDistance(startCanvas, endCanvas) * this.rapport
          console.log('info hauteur' + this.hauteur)

          //calcul de la latéralisation et de la distance des têtes
          if (toolsData.data[4]) {
            const centreTete = toolsData.data[3].handles.start
            console.log('pos tete = ' + centreTete.x + ' ' + centreTete.y)
            const centerTige = toolsData.data[4].handles.centerTige
            console.log('pos tige = ' + centerTige.x + ' ' + centerTige.y)
            var centreTige = { x: 0, y: 0 }
            centreTige.x =
              centerTige.x +
              (this._configuration.prosthesisHeadCenter.x -
                this._configuration.prosthesisRotCenter.x) /
                this.rapport
            centreTige.y =
              centerTige.y +
              (this._configuration.prosthesisHeadCenter.y -
                this._configuration.prosthesisRotCenter.y) /
                this.rapport
            //centreTige = cornerstone.pixelToCanvas(element, centreTige)
            console.log('pos Tetetige = ' + centreTige.x + ' ' + centreTige.y)
            console.log(
              'mesure niveau ' +
                (this._configuration.prosthesisHeadCenter.y -
                  this._configuration.prosthesisRotCenter.y),
            )
            console.log(
              'mesure niveau rapport' +
                (this._configuration.prosthesisHeadCenter.y -
                  this._configuration.prosthesisRotCenter.y) /
                  this.rapport,
            )
            this.distanceCentre =
              getDistance(centreTete, centreTige) * this.rapport
            console.log('distanceCentre : ' + this.distanceCentre)
            const point1 = {
              x: toolsData.data[1].handles.start.x + 1000,
              y: toolsData.data[1].handles.start.y + 1000 * coef,
            }
            const point2 = {
              x: toolsData.data[1].handles.start.x - 1000,
              y: toolsData.data[1].handles.start.y - 1000 * coef,
            }

            const perpoint = findPerpendicularPoint(point1, point2, centreTete)
            const pointLat = findPerpendicularPoint(
              centreTete,
              perpoint,
              centreTige,
            )
            //const pointLat = cornerstone.pixelToCanvas(element, perpoint2)
            console.log(centreTige)
            console.log(pointLat)
            this.lateralisation =
              getDistance(centreTige, pointLat) * this.rapport
            console.log('Lateralisation : ' + this.lateralisation)
          }
          drawLine(
            ctx,
            element,
            data.handles.start,
            p1,
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
            p2,
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
          const dist = data.handles.end.y - data.handles.start.y
          const text = dist.toString()
        }

        // une fois que tout les points de repères sont placés, on dessine la prothèse et lignes de points de repères
        else if (this.setProsthesis == true) {
          //tool color
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool2NonActif,
          )
          color = cornerstoneTools.toolColors.getColorIfActive(data)

          const toolsData = cornerstoneTools.getToolState(element, this.name)
          this.perpPoint = findPerpendicularPoint(
            this.middleLine.point1,
            this.middleLine.point2,
            toolsData.data[3].handles.start,
          )

          this.anglePoint = findAnglePoint(
            this.middleLine.point1,
            this.middleLine.point2,
            toolsData.data[3].handles.start,
          )
          if (
            this.anglePoint[0].x > 0 &&
            this.anglePoint[0].y > 0 &&
            this._configuration.lockTige == true
          ) {
            toolsData.data[4].handles.centerTige = this.anglePoint[0]
          }
          if (this._configuration.lockTige == true) {
            toolsData.data[4].handles.rotTige.x =
              toolsData.data[4].handles.centerTige.x
            toolsData.data[4].handles.rotTige.y =
              toolsData.data[4].handles.centerTige.y + 40
          }

          const getDistance = cornerstoneMath.point.distance
          const startCanvas = cornerstone.pixelToCanvas(
            element,
            this.anglePoint[0],
          )
          const endCanvas = cornerstone.pixelToCanvas(element, this.perpPoint)
          console.log('info distance px ' + getDistance(startCanvas, endCanvas))
          this.distance = getDistance(startCanvas, endCanvas) * this.rapport
          console.log(
            'le centre est en ' +
              toolsData.data[3].handles.start.x +
              ' ' +
              toolsData.data[3].handles.start.y,
          )
          console.log('info distance ' + this.distance)
          drawLines(
            ctx,
            element,
            toolsData.data[3].handles.start,
            this.perpPoint,
            this.anglePoint[0],
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
          //dessin de la tige de la prothèse qui se fixe au repère du centre de tête
          this.prosthesis = {
            gauche: this._configuration.pathTige,
            droit: this._configuration.pathTigeDroit,
          }
          cornerstoneTools.toolColors.setToolColor(
            this._configuration.colorTool5,
          )
          const centerHead = {
            x: toolsData.data[3].handles.start.x,
            y: toolsData.data[3].handles.start.y,
          }

          const r = cornerstone.pixelToCanvas(element, this.rayonPx)
          const xr = cornerstone.pixelToCanvas(
            element,
            toolsData.data[4].handles.rotTige.x,
          )
          const yr = cornerstone.pixelToCanvas(
            element,
            toolsData.data[4].handles.rotTige.y,
          )
          const xc = cornerstone.pixelToCanvas(
            element,
            toolsData.data[4].handles.centerTige.x,
          )
          const yc = cornerstone.pixelToCanvas(
            element,
            toolsData.data[4].handles.centerTige.y,
          )

          if (toolsData.data[4].handles.centerTige.active) {
            this.flag = true
          } else {
            this.flag = false
          }
          if (this.flag) {
            toolsData.data[4].handles.rotTige.x =
              toolsData.data[4].handles.centerTige.x + this.diffx
            toolsData.data[4].handles.rotTige.y =
              toolsData.data[4].handles.centerTige.y + this.diffy
          } else {
            this.diffx =
              toolsData.data[4].handles.rotTige.x -
              toolsData.data[4].handles.centerTige.x
            this.diffy =
              toolsData.data[4].handles.rotTige.y -
              toolsData.data[4].handles.centerTige.y
          }

          console.log(toolsData.data[4].handles.rotTige)
          if (toolsData.data[4].handles.rotTige.active) {
            while (
              toolsData.data[4].handles.rotTige.x <
              toolsData.data[4].handles.centerTige.x - 100
            ) {
              toolsData.data[4].handles.rotTige.x += 1
            }
            while (
              toolsData.data[4].handles.rotTige.x >
              toolsData.data[4].handles.centerTige.x + 100
            ) {
              toolsData.data[4].handles.rotTige.x -= 1
            }
            toolsData.data[4].handles.rotTige.y =
              toolsData.data[4].handles.centerTige.y + 40
          }
          console.log(toolsData.data[4].handles.rotTige)

          const line = {
            point1: toolsData.data[4].handles.rotTige,
            point2: toolsData.data[4].handles.centerTige,
          }
          //dessin de la tige de la prothèse qui est manipulable avec une handle
          var result = drawProsthesis(
            ctx,
            element,
            'pixel',
            { color },
            this.prosthesis,
            this.side,
            this.scale,
            this.rapport,
            this.middleLine,
            line,
            toolsData.data[4].handles.centerTige,
            this._configuration.prosthesisHeadCenter,
            this._configuration.prosthesisplusCenter,
            this._configuration.prosthesismoinsCenter,
            this._configuration.prosthesisRotCenter,
            this._configuration.prosthesisSize,
            this._configuration.prosthesisAngle,
            this._configuration.billeSize,
            'tige',
            this._configuration.tete,
            this._configuration.tetePos,
            this._configuration.teteNeg,
            this._configuration.diamTete,
          )
          console.log('resultats ' + result.x + ' ' + result.y)
          const p1 = {
            x: toolsData.data[4].handles.centerTige.x - 100,
            y: toolsData.data[4].handles.centerTige.y + 40,
          }
          const p2 = {
            x: toolsData.data[4].handles.centerTige.x + 100,
            y: toolsData.data[4].handles.centerTige.y + 40,
          }
          drawLine(
            ctx,
            element,
            p1,
            p2,
            {
              color,
            },
            'pixel',
            data.handles.initialRotation,
          )
        }

        cornerstoneTools.toolColors.setToolColor(this._configuration.colorTool5)

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
