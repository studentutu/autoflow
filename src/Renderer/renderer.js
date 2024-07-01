/* eslint-disable @typescript-eslint/no-var-requires */
const { ipcRenderer } = require('electron');
// const { imageSize } = require('image-size');
// const cv = require("@techstark/opencv-js");
// const Jimp = require('jimp');

// This is render process.
// Check if opencv is installed and working. Check with opencv button.
// const cv = require('opencv-wasm-node');

const dropZone = document.getElementById('drop-zone');
const input = document.getElementById('fileInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const lastmouseclick = document.getElementById('last-mouse-click');

const openCvButton = document.getElementById('opencv-btn');
const opencvTargetInput = document.getElementById('opencv-target');
const opencvScreenshotInput = document.getElementById('opencv-screenshot');
const canvasTarget = document.getElementById('opencv-target-canvas');
const canvasScreenshot = document.getElementById('opencv-screenshot-canvas');

dropZone.addEventListener('dragover', (event) => {
    event.preventDefault(); // Prevent default browser behavior
    dropZone.classList.add('dragover'); // Add a visual indication (optional)
});

dropZone.addEventListener('drop', (event) => {
    event.preventDefault();
    const files = event.dataTransfer.files; // Get the dropped file
    handleFiles(files); // Handle the dropped files (function explained later)
    dropZone.classList.remove('dragover'); // Remove visual indication
});

input.addEventListener('change', (event) => {
    event.preventDefault(); // Prevent default form submission if applicable

    // const target = event.target as HTMLInputElement;
    const files = event.target.files;
    handleFiles(files); // Handle the dropped files (function explained later)
    dropZone.classList.remove('dragover'); // Remove visual indication
})


startBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission if applicable

    ipcRenderer.send("start-workflow");
})

stopBtn.addEventListener('click', (event) => {
    event.preventDefault(); // Prevent default form submission if applicable

    ipcRenderer.send("stop-workflow");
})


//files: FileList
function handleFiles(files) {

    if (files.length == 0)
        return;

    const file = files[0]; // Get the dropped file

    if (file.type !== 'application/json') {
        alert('Please drop a JSON file only!');
        return;
    }

    const reader = new FileReader();
    reader.onload = () => {
        const jsonStringData = reader.result;
        // Do something with the parsed JSON data
        console.log(jsonStringData);

        ipcRenderer.send("workflow-data", jsonStringData);
    };
    reader.readAsText(file);
}


document.addEventListener("mousedown", function (event) {
    // This function will be executed when the mouse is clicked
    //  and will capture the click position
    ipcRenderer.send("notify-button-click");
});

ipcRenderer.on("notify-button-click-ui", (event, position) => {
    lastmouseclick.textContent = `Last mouse click x: ${position.x} y: ${position.y}`;
});

ipcRenderer.on("alert", (event, message) => {
    alert(message);
});

ipcRenderer.on("debug", (event, message) => {
    console.log(message);
});

ipcRenderer.on("error", (event, message) => {
    console.error(message);
});

ipcRenderer.on("render-material", async (event, imagDataWithCanvas) => {
    await renderMaterial(imagDataWithCanvas);
});


openCvButton.addEventListener("click", async function (event) {
    event.preventDefault(); // Prevent default form submission if applicable

    // console.log('cv.build info' + cv.getBuildInformation());
    ipcRenderer.send("check-opencv");
});

opencvTargetInput.addEventListener("change", function (event) {
    event.preventDefault(); // Prevent default form submission if applicable

    const file = event.target.files[0];
    if (file) {
        // Check for valid image file (optional)
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            let uploadedImageBase64 = reader.result;

            await sendImageDataAsOpenCvData("change-target-image", uploadedImageBase64);
        };
        reader.readAsDataURL(file);
    }
});

process.on('uncaughtException', (error) => {
    console.error(`Caught exception: ${error}\n` + `Exception origin: ${error.stack}`);
});

process.on('unhandledRejection', (reason, p) => {
    console.error('Unhandled Rejection at:', p, 'reason:', reason);
});

opencvScreenshotInput.addEventListener("change", function (event) {
    event.preventDefault(); // Prevent default form submission if applicable

    const file = event.target.files[0];
    if (file) {
        // Check for valid image file (optional)
        if (!file.type.startsWith('image/')) {
            alert('Please select a valid image file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async () => {
            let uploadedImagebase64 = reader.result;

            await sendImageDataAsOpenCvData("change-screenshot-image", uploadedImagebase64);
        };
        reader.readAsDataURL(file);
    }
});

async function sendImageDataAsOpenCvData(stringTargetEvent, base64String) {

    try {
        const dataForOpenCv = {
            base64String: base64String
        };

        ipcRenderer.send(stringTargetEvent, dataForOpenCv);
    } catch (err) {
        console.error(err);
    }
}

/*
* Renders image data with canvas
* @param 
* imagDataWithCanvas: 
* {
*   canvasName: string,
*   data: base64string,
*   width: number,
*   height: number
* }
*
*/
async function renderMaterial({ canvasName, data, width, height }) {

    const bufferFromBase64 = Buffer.from(data, 'base64');
    const canvas = document.getElementById(canvasName);

    canvas.width = width;
    canvas.height = height;

    const imageData = new ImageData(width, height);
    imageData.data.set(bufferFromBase64);

    const ctx = canvas.getContext('2d');

    // Can't draw if imgData.Buffer is not of size 4*width (RGBA).
    // Make buffer for imgData in RGBA!
    ctx.putImageData(imageData, 0, 0);
}

// async function CheckCvFromRenderer(data) {
//     console.log("Size width" + data.width + "x height" + data.height);

//     const pngPrefix = 'data:image/jpeg;base64,';
//     const jpgPrefix = 'data:image/png;base64,';

//     const base64Data = data.base64String.replace(pngPrefix, '').replace(jpgPrefix, '');
//     const bufferFromBase64 = Buffer.from(base64Data, 'base64');

//     var jimpSrc = await Jimp.read(bufferFromBase64);
//     var mat = cv.matFromImageData(jimpSrc.bitmap);

//     cv.imshow("opencv-target-canvas", mat);
// }