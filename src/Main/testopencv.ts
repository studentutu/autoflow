/* eslint-disable @typescript-eslint/no-var-requires */
import cv from "@techstark/opencv-js"
import { alert, debug, error, renderMaterial } from './alert';
import sd from 'screenshot-desktop';
import sizeOf from "image-size";


// import type * as openCV from './types/';
// export type * as openCV from './types/';
// /**
//  * OpenCV Object
//  */
// export declare const cv: typeof openCV;
// /**
//  * Translate error number from OpenCV into a meaningful message
//  * @param cvObject OpenCV object
//  * @param err OpenCV error number 
//  */
// export function cvTranslateError(cvObject: typeof openCV, err: any): string | Error | undefined;
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

export function TestOpenCvVersion() {

    // await loadOpenCV();
    // cv.setupOpenCv();

    // setTimeout(() => {
    try {

        debug(cv.getAvailableBackends());
        // cv.onRuntimeInitialized();


        debug(cv.getVersionString());
        debug("Build info: " + cv.getBuildInformation());
        debug("Is using optimized: " + cv.useOptimized());

    } catch (err) {
        error(err);
        // cv.exceptionFromPtr(err);
    }

    // }, 1000);
}


export class TestOpenCv {

    ImageTargetMat: cv.Mat;
    ImageScreenshotMat: cv.Mat;

    async ChangeTargetImage(stringImageAsBase64: string) {
        this.ImageTargetMat = await decodeBase64ToMatBgr(stringImageAsBase64);

        renderImage(this.ImageTargetMat, "opencv-target-canvas");
    }

    async ChangeScreenshotImage(stringImageAsBase64: string) {
        this.ImageScreenshotMat = await decodeBase64ToMatBgr(stringImageAsBase64);
        renderImage(this.ImageScreenshotMat, "opencv-screenshot-canvas");
    }

    async CheckWithOpenCv() {

        try {
            debug(cv.getVersionString());
        } catch (err) {
            error(err);
            // cv.exceptionFromPtr(err);
            return;
        }

        if (this.ImageTargetMat === undefined || this.ImageTargetMat == null)
            return;

        if (this.ImageScreenshotMat === undefined || this.ImageScreenshotMat == null)
            return;

        const copyForResult = this.ImageScreenshotMat.clone();

        const kernelSize = new cv.Size(3, 3);

        const cvTargetImage = this.ImageTargetMat;
        const cvScreenshot = this.ImageScreenshotMat;
        cv.cvtColor(cvTargetImage, cvTargetImage, cv.COLOR_BGR2GRAY);
        cv.cvtColor(cvScreenshot, cvScreenshot, cv.COLOR_BGR2GRAY);

        cv.GaussianBlur(cvTargetImage, cvTargetImage, kernelSize, 0);
        cv.GaussianBlur(cvScreenshot, cvScreenshot, kernelSize, 0);



        // TM_SQDIFF_NORMED - best min
        // TM_CCOEFF_NORMED - best max
        const matchResult = new cv.Mat();
        cv.matchTemplate(cvScreenshot, cvTargetImage, matchResult, cv.TM_CCOEFF_NORMED);

        const result = cv.minMaxLoc(matchResult, null);
        const minPoint = result.minLoc;
        const maxPoint = result.maxLoc;

        const color = new cv.Scalar(0, 255, 0, 255);
        const rect = new cv.Rect(maxPoint.x, maxPoint.y, cvTargetImage.cols, cvTargetImage.rows);

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
        copyForResult.delete();
    }

    // slow analog to opencv.getScoreMax(matchResultMaterial, threshold)
    getScoreMax(material: cv.Mat, confidence: number, targetMaterial: cv.Mat): Array<MatchCoord> {

        const width = targetMaterial.cols;
        const height = targetMaterial.rows;

        // The same as: 
        // opencv.getScoreMax(matchResult, threshold)
        //     .map(m => new MatchCoord(m[0], m[1], m[2], cvTargetImage.cols, cvTargetImage.rows));
        // TODO: Reduce by using dropOverlappingZone


        // const matches = [] as Array<MatchCoord>;
        // const data =  material.data;

        // for (let y = 0; y < material.rows; y++) {
        //     for (let x = 0; x < material.cols; x++) {
        //         const value = material.doubleAt(y, x);

        //         if (value >= confidence) {
        //             matches.push(new MatchCoord(x, y, value, width, height));
        //         }
        //     }
        // }
        return getScoreMaxOpenCv4Node(material, confidence)
            .map(m => new MatchCoord(m[0], m[1], m[2], width, height));
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

    draw(mat: cv.Mat) {
        // const rect = new cv.Rect(this.x, this.y, this.width, this.height);

        const color = new cv.Scalar(0, 255, 0, 255);
        const startPoint = new cv.Point(this.x, this.y);
        const endPoint = new cv.Point(this.x + this.width, this.y + this.height);

        cv.rectangle(mat, startPoint, endPoint, color, 2, cv.LINE_8, 0);
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


/**
 * Find values greater than threshold in a 32bit float matrix and return a list of matchs formated as [[x1, y1, score1]. [x2, y2, score2], [x3, y3, score3]]
 * add to be used with matchTemplate
 * non Natif code
 * @param scoreMat Matric containing scores as 32Bit float (CV_32F)
 * @param threshold Minimal score to collect
 * @param region search region
 * @returns a list of matchs
 */
export function getScoreMaxOpenCv4Node(scoreMat: cv.Mat, threshold: number, region?: cv.Rect): Array<[number, number, number]> {
    if (scoreMat.type !== cv.CV_32F)
        throw Error('this method can only be call on a CV_32F Mat');
    if (scoreMat.dims !== 2)
        throw Error('this method can only be call on a 2 dimmention Mat');

    const out: Array<[number, number, number]> = [];
    const { cols, rows } = scoreMat;
    const raw = scoreMat.data;

    let x1: number, x2: number, y1: number, y2: number;
    if (region) {
        x1 = region.x;
        y1 = region.y;
        x2 = x1 + region.width;
        y2 = y1 + region.height;
    } else {
        x1 = y1 = 0;
        x2 = cols;
        y2 = rows;
    }


    for (let y = y1; y < y2; y++) {
        let offset = (x1 + y * cols) * 4;
        for (let x = x1; x < x2; x++) {
            const value = raw.at(offset);
            if (value >= threshold) {
                out.push([x, y, value]);
            }
            offset += 4;
        }
    }
    return out;
}

/**
 * Drop overlaping zones, keeping best one
 * @param template template Matrix used to get dimentions.
 * @param matches list of matches as a list in [x,y,score]. (this data will be altered)
 * @returns best match without colisions
 */
export function dropOverlappingZone(template: cv.Mat, matches: Array<[number, number, number]>): Array<[number, number, number]> {
    const total = matches.length;
    const width = template.cols / 2;
    const height = template.rows / 2;
    for (let i = 0; i < total; i++) {
        const cur = matches[i];
        if (!cur[2]) continue;
        for (let j = i + 1; j < total; j++) {
            const sec = matches[j];
            if (!sec[2]) continue;
            if (Math.abs(cur[1] - sec[1]) > height) continue;
            if (Math.abs(cur[0] - sec[0]) > width) continue;
            if (cur[2] > sec[2]) {
                sec[2] = 0;
            } else {
                cur[2] = 0;
                break;
            }
        }
    }
    return matches.filter(m => m[2]);
}



export async function decodeBase64ToMatBgr(base64String: string): Promise<cv.Mat> {
    const pngPrefix = 'data:image/jpeg;base64,';
    const jpgPrefix = 'data:image/png;base64,';

    const base64Data = base64String.replace(pngPrefix, '').replace(jpgPrefix, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const dimenstions = sizeOf(buffer);

    const imgData = {
        data: buffer,
        width: dimenstions.width,
        height: dimenstions.height
    } as cv.ImageData;

    return cv.matFromImageData(imgData);
}

export async function renderImage(initialMat: cv.Mat, canvas: string): Promise<void> {

    if (initialMat.cols > 800) {
        cv.resize(initialMat, initialMat, new cv.Size(0, 0), 0.5, 0.5, cv.INTER_AREA);
        // initialMat = await initialMat.rescaleAsync(0.5);
    }

    const matRGBA = new cv.Mat();
    if (initialMat.channels() === 1) {
        // initialMat.cvtColor(opencv.COLOR_GRAY2RGBA) 
        cv.cvtColor(initialMat, matRGBA, cv.COLOR_GRAY2RGBA);
    }
    else {
        // initialMat.cvtColor(opencv.COLOR_BGR2RGBA);
        cv.cvtColor(initialMat, matRGBA, cv.COLOR_BGR2RGBA);
    }

    debug("initialMat has channels " + initialMat.channels);

    const toBase64 = Buffer.from(matRGBA.data).toString('base64');

    renderMaterial({
        canvasName: canvas,
        data: toBase64,
        width: matRGBA.cols,
        height: matRGBA.rows
    });

    matRGBA.delete();
}