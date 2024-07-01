/* eslint-disable @typescript-eslint/no-var-requires */
import cv from "@techstark/opencv-js"
import { alert, debug, error, renderMaterial } from './alert';
import sd from 'screenshot-desktop';
import sizeOf from "image-size";
import Jimp from 'jimp';

// This is main process.
// Test if opencv is installed and working with TestOpenCvVersion().
// import * as opencv from 'opencv-wasm-node';



// import type * as openCV from './types/';
// export type * as openCV from './types/';
// /**
//  * OpenCV Object
//  */
// export declare const cv: typeof openCV;
// export default cv;
// /**
//  * Translate error number from OpenCV into a meaningful message
//  * @param cvObject OpenCV object
//  * @param err OpenCV error number 
//  */
// export function cvTranslateError(cvObject: typeof openCV, err: any): string | Error | undefined;
let currentTest: TestOpenCv = null;

class DataForOpenCv {
    base64String: string;
}

export function GetCurrentTest(): TestOpenCv {
    if (currentTest == null) {
        SetTest(new TestOpenCv());
    }

    return currentTest;
}

export function SetTest(newTest: TestOpenCv) {
    currentTest = newTest;
}

export function TestOpenCvVersion() {

    setTimeout(() => {
        // THis will be called after 1 second.
        try {
            debug('cv.build info' + cv.getBuildInformation());
            // debug("OpenCV targets " + cv.getAvailableBackends());
        } catch (err) {

            error(err);
            error(cv.exceptionFromPtr(err));
        }
    }, 1000);
}


export class TestOpenCv {

    ImageTargetMat: cv.Mat;
    ImageScreenshotMat: cv.Mat;

    async ChangeTargetImage(data: DataForOpenCv) {
        this.ImageTargetMat = await decodeBase64ToMatBgr(data);

        renderImage(this.ImageTargetMat, "opencv-target-canvas");
    }

    async ChangeScreenshotImage(data: DataForOpenCv) {
        this.ImageScreenshotMat = await decodeBase64ToMatBgr(data);

        renderImage(this.ImageScreenshotMat, "opencv-screenshot-canvas");
    }

    async CheckWithOpenCv() {

        try {


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
            const matchedMask = new cv.Mat(cvTargetImage.rows, cvTargetImage.cols, cvTargetImage.type());

            cv.matchTemplate(cvScreenshot, cvTargetImage, matchResult, cv.TM_CCOEFF_NORMED, matchedMask);

            // const result = cv.minMaxLoc(matchResult, null);
            // const minPoint = result.minLoc;
            // const maxPoint = result.maxLoc;

            const color = new cv.Scalar(0, 255, 0, 255);
            // const rect = new cv.Rect(maxPoint.x, maxPoint.y, cvTargetImage.cols, cvTargetImage.rows);

            // const matchedCoordinate = new MatchCoord(maxPoint.x, maxPoint.y, result.maxVal, cvTargetImage.cols, cvTargetImage.rows);

            // debug("Min " + result.minVal);
            // debug("Max " + result.maxVal);
            // matchedCoordinate.draw(copyForResult);

            // Set a threshold for a good match (adjust as needed)
            const threshold = 0.8; // Experiment with different values

            // Multiple matches
            const matches1 = this.getScoreMax(matchResult, threshold, cvTargetImage);
            debug("All matches " + matches1.length);

            matches1.map(match => {
                match.draw(copyForResult);
            });

            await renderImage(copyForResult, "opencv-screenshot-canvas");

            copyForResult.delete();
            matchResult.delete();
            matchedMask.delete();
        } catch (err) {
            error(err);
        }
    }

    getScoreMax(material: cv.Mat, confidence: number, targetMaterial: cv.Mat): Array<MatchCoord> {

        const width = targetMaterial.cols;
        const height = targetMaterial.rows;

        // The same as: opencv4nodejs
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
 * @param scoreMat Matric containing scores
 * @param threshold Minimal score to collect in range 0-1
 * @param region search region
 * @returns a list of matchs
 */
export function getScoreMaxOpenCv4Node(nonNormalized: cv.Mat, threshold: number, region?: cv.Rect): Array<[number, number, number]> {
    if (nonNormalized.dims !== 2)
        throw Error('Custom: this method can only be call on a 2 dimmention Mat. Found ' + nonNormalized.dims);

    const out: Array<[number, number, number]> = [];
    const { cols, rows } = nonNormalized;

    // Data value type is depends on the Mat type.
    const scoreMat = NormalizedMaterialValues(nonNormalized);
    const raw = scoreMat.data;

    debug("data type is " + scoreMat.type());

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
    scoreMat.delete();
    return out;
}

export function NormalizedMaterialValues(fromMat: cv.Mat): cv.Mat {

    const mat = new cv.Mat(fromMat.rows, fromMat.cols, cv.CV_32F);

    fromMat.convertTo(mat, cv.CV_32F);

    return mat;
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


export async function decodeBase64ToMatBgr(data: DataForOpenCv): Promise<cv.Mat> {

    const pngPrefix = 'data:image/jpeg;base64,';
    const jpgPrefix = 'data:image/png;base64,';

    const base64Data = data.base64String.replace(pngPrefix, '').replace(jpgPrefix, '');
    const bufferFromBase64 = Buffer.from(base64Data, 'base64');

    // opencv4nodejs -> uses direct imdecode (COLOR_BGR)
    // Jimp -> uses image buffer (COLOR_RGBA)
    const jimpSrc = await Jimp.read(bufferFromBase64);
    const mat = cv.matFromImageData(jimpSrc.bitmap);

    const width = mat.cols;
    const height = mat.rows;

    return mat;
}

export async function renderImage(initialMat: cv.Mat, canvas: string): Promise<void> {

    try {
        const matRGBA = initialMat.clone();

        debug("initialMat has channels " + initialMat.channels() + " colums " + initialMat.cols + " rows " + initialMat.rows + " type " + initialMat.type());
        if (initialMat.cols > 800) {
            cv.resize(matRGBA, matRGBA, new cv.Size(0, 0), 0.5, 0.5, cv.INTER_AREA);
            // matRGBA = await matRGBA.rescaleAsync(0.5);
        }

        if (matRGBA.channels() === 1) {
            // matRGBA.cvtColor(opencv.COLOR_GRAY2RGBA);
            cv.cvtColor(matRGBA, matRGBA, cv.COLOR_GRAY2RGBA);
        }
        else {
            // If using cv.imdecode from opencv4nodejs, so we need to convert from opencv4nodejs format (COLOR_BGR2RGBA)
            // matRGBA.cvtColor(opencv.COLOR_BGR2RGBA);
            // cv.cvtColor(matRGBA, matRGBA, cv.COLOR_BGR2RGBA);
        }

        debug("matRGBA " + matRGBA.channels() + " colums " + matRGBA.cols + " rows " + matRGBA.rows + " type " + matRGBA.type());

        const toBase64 = Buffer.from(matRGBA.data).toString('base64');

        renderMaterial({
            canvasName: canvas,
            data: toBase64,
            width: matRGBA.cols,
            height: matRGBA.rows
        });

        matRGBA.delete();
    } catch (err) {
        error(err);
    }
}