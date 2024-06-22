// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcRenderer } = require('electron');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sd = require('screenshot-desktop');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const cv = require('opencv4nodejs-prebuilt-install');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require('node:path');

const dropZone = document.getElementById('drop-zone');
const input = document.getElementById('fileInput');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const lastmouseclick = document.getElementById('last-mouse-click');

const openCvButton = document.getElementById('opencv-btn');
const opencvTargetInput = document.getElementById('opencv-target');
const opencvScreenshotInput = document.getElementById('opencv-screenshot');
const imgtargetCanvas = document.getElementById('opencv-input');
const screenshotCanvas = document.getElementById('opencv-mask');

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

ipcRenderer.on("on-render-base64-screenshot", (event, uploadedImage) => {
    // renderImageFromBase64(uploadedImage, screenshotCanvas);
});

const currentTest = new TestOpenCv();

openCvButton.addEventListener("click", async function (event) {
    event.preventDefault(); // Prevent default form submission if applicable

    currentTest.CheckWithOpenCv();
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
            currentTest.ImageTargetMat = await decodeBase64ToMatBgr(uploadedImageBase64);

            await renderImageFromBase64(uploadedImageBase64, imgtargetCanvas);
        };
        reader.readAsDataURL(file);
    }
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

            let screenMat = await decodeBase64ToMatBgr(uploadedImagebase64);
            let copyForResult = await screenMat.copyAsync();
            currentTest.ImageScreenshotMat = screenMat;

            let kernelSize = new cv.Size(3, 3);

            let cvTargetImage = await currentTest.ImageTargetMat.cvtColorAsync(cv.COLOR_BGR2GRAY);
            cvTargetImage = await cvTargetImage.gaussianBlurAsync(kernelSize, 0);

            let cvScreenshot = await screenMat.cvtColorAsync(cv.COLOR_BGR2GRAY);
            cvScreenshot = await cvScreenshot.gaussianBlurAsync(kernelSize, 0);

            // TM_SQDIFF_NORMED - best min
            // TM_CCOEFF_NORMED - best max
            const matchResult = await cvScreenshot.matchTemplateAsync(cvTargetImage, cv.TM_CCOEFF_NORMED);

            let result = matchResult.minMaxLoc();
            let minPoint = result.minLoc;
            let maxPoint = result.maxLoc;

            let color = new cv.Vec3(0, 255, 0);
            let rect = new cv.Rect(maxPoint.x, maxPoint.y, cvTargetImage.cols, cvTargetImage.rows);

            console.log("Min " + result.minVal);
            console.log("Max " + result.maxVal);
            // copyForResult.drawRectangle(rect, color, 2);

            // Set a threshold for a good match (adjust as needed)
            const threshold = 0.8; // Experiment with different values

            // Multiple matches
            const matches1 = cv.getScoreMax(matchResult, threshold)
                .map(m => new MatchCoord(m[0], m[1], m[2], cvTargetImage.cols, cvTargetImage.rows));

            console.log("All matches " + matches1.length);

            matches1.map(match => {
                match.draw(copyForResult);
            });
            // renderImageFromBase64(uploadedImagebase64, screenshotCanvas);
            await renderImage(copyForResult, screenshotCanvas);
        };
        reader.readAsDataURL(file);
    }
});


async function makeScreenshotBuffer() {
    // Incorrect encoding.
    // TODO: set screen to capture.
    let displays = await sd.listDisplays();

    const image = await sd({ screen: displays[displays.length - 1].id });
    const buffer = Buffer.from(image.buffer);
    return buffer;
}


async function renderImageFromBase64(imageAsBase64, canvas) {

    let mat = await decodeBase64ToMatBgr(imageAsBase64);

    await renderImage(mat, canvas);
}

async function renderImage(initialMat, canvas) {

    if (initialMat.cols > 800) {
        initialMat = await initialMat.rescaleAsync(0.5);
    }

    var matRGBA = initialMat.channels === 1 ? initialMat.cvtColor(cv.COLOR_GRAY2RGBA) : initialMat.cvtColor(cv.COLOR_BGR2RGBA);

    console.log("initialMat has channels " + initialMat.channels);
    canvas.height = matRGBA.rows;
    canvas.width = matRGBA.cols;
    var imgData = new ImageData(
        new Uint8ClampedArray(matRGBA.getData()),
        matRGBA.cols,
        matRGBA.rows
    );
    var ctx = canvas.getContext('2d');

    // Can't draw if imgData.Buffer is on of size 4*width (RGBA).
    // Make buffer for imgData is in RGBA!
    ctx.putImageData(imgData, 0, 0);
}


async function decodeBase64ToMatBgr(base64String) {
    const pngPrefix = 'data:image/jpeg;base64,';
    const jpgPrefix = 'data:image/png;base64,';

    var base64Data = base64String.replace(pngPrefix, '').replace(jpgPrefix, '');
    var buffer = Buffer.from(base64Data, 'base64');
    return await cv.imdecodeAsync(buffer);
}