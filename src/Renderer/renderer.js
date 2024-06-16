// eslint-disable-next-line @typescript-eslint/no-var-requires
const { ipcRenderer } = require('electron');
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