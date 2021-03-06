import cornerstoneTools from 'cornerstone-tools'
const { state, modules } = cornerstoneTools.store

export { setToolCursor, resetToolCursor, hideToolCursor }

const globalConfiguration = modules.globalConfiguration

/**
 * Creates an SVG Cursor for the target element
 *
 * @param {HTMLElement} element - The DOM Element to draw on
 * @param {MouseCursor} svgCursor - The cursor.
 * @returns {void}
 */
function setToolCursor(element: HTMLElement, svgCursor: any) {
  if (!globalConfiguration.configuration.showSVGCursors) {
    return
  }
  // TODO: (state vs options) Exit if cursor wasn't updated
  // TODO: Exit if invalid options to create cursor

  // Note: Max size of an SVG cursor is 128x128, default is 32x32.
  const cursorBlob = svgCursor.getIconWithPointerSVG()
  const mousePoint = svgCursor.mousePoint

  const svgCursorUrl = window.URL.createObjectURL(cursorBlob)

  element.style.cursor = `url('${svgCursorUrl}') ${mousePoint}, auto`

  state.svgCursorUrl = svgCursorUrl
}

function resetToolCursor(element: HTMLElement) {
  _clearStateAndSetCursor(element, 'initial')
}

function hideToolCursor(element: HTMLElement) {
  if (!globalConfiguration.configuration.showSVGCursors) {
    return
  }

  _clearStateAndSetCursor(element, 'none')
}

function _clearStateAndSetCursor(element: HTMLElement, cursorSeting: any) {
  if (state.svgCursorUrl) {
    window.URL.revokeObjectURL(state.svgCursorUrl)
  }

  state.svgCursorUrl = null
  element.style.cursor = cursorSeting
}
