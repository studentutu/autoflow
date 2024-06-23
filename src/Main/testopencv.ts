/* eslint-disable @typescript-eslint/no-var-requires */
import * as wasmcv from '@dalongrong/opencv-wasm';
import { alert, debug, error, renderMaterial } from './alert';
import sd from 'screenshot-desktop';


let currentTest: TestOpenCv = null;


export function GetCurrentTest(): TestOpenCv {
    if (currentTest == null) {
        currentTest = new TestOpenCv();
    }

    return currentTest;
}

export function SetTest(newTest: TestOpenCv) {
    currentTest = newTest;
}


export class TestOpenCv {

    ImageTargetMat: wasmcv.openCV.Mat;
    ImageScreenshotMat: wasmcv.openCV.Mat;

    async ChangeTargetImage(stringImageAsBase64: string) {
        this.ImageTargetMat = await decodeBase64ToMatBgr(stringImageAsBase64);

        renderImage(this.ImageTargetMat, "opencv-target-canvas");
    }

    async ChangeScreenshotImage(stringImageAsBase64: string) {
        this.ImageScreenshotMat = await decodeBase64ToMatBgr(stringImageAsBase64);
        renderImage(this.ImageScreenshotMat, "opencv-screenshot-canvas");
    }

    async CheckWithOpenCv() {

        if (this.ImageTargetMat === undefined || this.ImageTargetMat == null)
            return;

        if (this.ImageScreenshotMat === undefined || this.ImageScreenshotMat == null)
            return;

        const copyForResult = this.ImageScreenshotMat.clone();

        const kernelSize = new wasmcv.cv.Size(3, 3);

        const cvTargetImage = this.ImageTargetMat;
        const cvScreenshot = this.ImageScreenshotMat;
        wasmcv.cv.cvtColor(cvTargetImage, cvTargetImage, wasmcv.cv.COLOR_BGR2GRAY);
        wasmcv.cv.cvtColor(cvScreenshot, cvScreenshot, wasmcv.cv.COLOR_BGR2GRAY);

        wasmcv.cv.GaussianBlur(cvTargetImage, cvTargetImage, kernelSize, 0);
        wasmcv.cv.GaussianBlur(cvScreenshot, cvScreenshot, kernelSize, 0);



        // TM_SQDIFF_NORMED - best min
        // TM_CCOEFF_NORMED - best max
        const matchResult = new wasmcv.cv.Mat();
        wasmcv.cv.matchTemplate(cvScreenshot, cvTargetImage, matchResult, wasmcv.cv.TM_CCOEFF_NORMED);

        const result = wasmcv.cv.minMaxLoc(matchResult);
        const minPoint = result.minLoc;
        const maxPoint = result.maxLoc;

        const color = new wasmcv.cv.Scalar(0, 255, 0, 255);
        const rect = new wasmcv.cv.Rect(maxPoint.x, maxPoint.y, cvTargetImage.cols, cvTargetImage.rows);

        console.log("Min " + result.minVal);
        console.log("Max " + result.maxVal);
        // copyForResult.drawRectangle(rect, color, 2);

        // Set a threshold for a good match (adjust as needed)
        const threshold = 0.8; // Experiment with different values

        // Multiple matches
        const matches1 = this.getScoreMax(matchResult, threshold, cvTargetImage);
        console.log("All matches " + matches1.length);

        matches1.map(match => {
            match.draw(copyForResult);
        });

        await renderImage(copyForResult, "opencv-screenshot-canvas");
    }

    // slow analog to opencv.getScoreMax(matchResultMaterial, threshold)
    getScoreMax(material: wasmcv.openCV.Mat, confidence: number, targetMaterial: wasmcv.openCV.Mat): Array<MatchCoord> {
        // The same as: 
        // opencv.getScoreMax(matchResult, threshold)
        //     .map(m => new MatchCoord(m[0], m[1], m[2], cvTargetImage.cols, cvTargetImage.rows));

        const lines = material.getDataAsArray();
        const width = targetMaterial.cols;
        const height = targetMaterial.rows;

        const matches = [] as Array<MatchCoord>;
        for (let y = 0; y < lines.length; y++) {
            const line = lines[y];
            for (let x = 0; x < line.length; x++) {
                const value = line[x];
                if (value > confidence) {
                    matches.push(new MatchCoord(x, y, value, width, height));
                }
            }
        }
        return matches;
    }
}

export class MatchCoord {
    x;
    y;
    value;
    width;
    height;

    constructor(x, y, value, width, height) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.width = width;
        this.height = height;
    }

    prettyString() {
        return `${this.x}x${this.y} confidence:${this.value}`;
    }

    draw(mat: wasmcv.openCV.Mat) {
        const rect = new wasmcv.cv.Rect(this.x, this.y, this.width, this.height);
        // rect = rect.pad(1.8);
        const color = new wasmcv.cv.Scalar(0, 255, 0, 255);
        const startPoint = new wasmcv.cv.Point(this.x, this.y);
        const endPoint = new wasmcv.cv.Point(this.x + this.width, this.y + this.height);

        wasmcv.cv.rectangle(mat, startPoint, endPoint, color, 2, wasmcv.cv.LINE_8, 0);
        // mat.drawRectangle(rect, color, 2);
    }
}

async function makeScreenshotBuffer() {
    // Incorrect encoding.
    // TODO: set screen to capture.
    const displays = await sd.listDisplays();

    const image = await sd({ screen: displays[displays.length - 1].id });
    const buffer = Buffer.from(image.buffer);
    return buffer;
}



export async function decodeBase64ToMatBgr(base64String: string): Promise<wasmcv.openCV.Mat> {
    const pngPrefix = 'data:image/jpeg;base64,';
    const jpgPrefix = 'data:image/png;base64,';

    const base64Data = base64String.replace(pngPrefix, '').replace(jpgPrefix, '');
    const buffer = Buffer.from(base64Data, 'base64');

    return wasmcv.cv.imdecode(buffer);
}

export async function renderImage(initialMat: wasmcv.openCV.Mat, canvas: string): Promise<void> {

    if (initialMat.cols > 800) {
        wasmcv.cv.resize(initialMat, initialMat, new wasmcv.cv.Size(0, 0), 0.5, 0.5, wasmcv.cv.INTER_AREA);
        // initialMat = await initialMat.rescaleAsync(0.5);
    }

    const matRGBA = new wasmcv.cv.Mat();
    if (initialMat.channels() === 1) {
        // initialMat.cvtColor(opencv.COLOR_GRAY2RGBA) 
        wasmcv.cv.cvtColor(initialMat, matRGBA, wasmcv.cv.COLOR_GRAY2RGBA);
    }
    else {
        // initialMat.cvtColor(opencv.COLOR_BGR2RGBA);
        wasmcv.cv.cvtColor(initialMat, matRGBA, wasmcv.cv.COLOR_BGR2RGBA);
    }

    debug("initialMat has channels " + initialMat.channels);
    const data = await matRGBA.getDataAsync();
    // const toBase61 = data.toString('base64');

    // renderMaterial({
    //     canvasName: canvas,
    //     data: matRGBA.getData().toString('base64'),
    //     width: matRGBA.cols,
    //     height: matRGBA.rows
    // });
}