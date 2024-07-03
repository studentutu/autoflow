// eslint-disable-next-line @typescript-eslint/no-var-requires
const { BrowserWindow } = require('electron');

var activeWindow = null;

export function alert(msg) {
    if (activeWindow == undefined || activeWindow == null)
        activeWindow = BrowserWindow.getFocusedWindow();

    activeWindow.webContents.send("alert", msg);
}
exports.alert = alert;

export function debug(msg) {
    if (activeWindow == undefined || activeWindow == null)
        activeWindow = BrowserWindow.getFocusedWindow();

    activeWindow.webContents.send("debug", msg);
}
exports.debug = debug;

export function error(msg) {
    if (activeWindow == undefined || activeWindow == null)
        activeWindow = BrowserWindow.getFocusedWindow();

    activeWindow.webContents.send("error", msg);
}
exports.error = error;


export function displayLastMouseClick(msg) {
    if (activeWindow == undefined || activeWindow == null)
        activeWindow = BrowserWindow.getFocusedWindow();

    activeWindow.webContents.send("notify-button-click-ui", msg);
}
exports.displayLastMouseClick = displayLastMouseClick;

// For test purposes
/*
* Renders image data with canvas
* @param 
* imagDataWithCanvas: 
* {
*   canvasName: string = id of canvas element,
*   data: base64string - encodes RGBA CV_8UC4 material,
*   width: number - material colums,
*   height: number - material rows
* }
*
*/
export function renderMaterial(imagDataWithCanvas) {
    if (activeWindow == undefined || activeWindow == null)
        activeWindow = BrowserWindow.getFocusedWindow();

    activeWindow.webContents.send("render-material", imagDataWithCanvas);
}
exports.renderMaterial = renderMaterial;
