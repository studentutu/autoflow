/* eslint-disable @typescript-eslint/no-var-requires */
import cv, { CV } from "@techstark/opencv-js"
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

            const targetGray = new cv.Mat();
            const screenshotGray = new cv.Mat();
            // If using cv.imdecode from opencv4nodejs, so we need to convert from opencv4nodejs format (COLOR_BGR2GRAY)
            // otherwise COLOR_RGBA2GRAY (Jimp)
            cv.cvtColor(this.ImageTargetMat, targetGray, cv.COLOR_RGBA2GRAY);
            cv.cvtColor(this.ImageScreenshotMat, screenshotGray, cv.COLOR_RGBA2GRAY);


            const cvTargetImage = new cv.Mat();
            const cvScreenshot = new cv.Mat();
            cv.GaussianBlur(targetGray, cvTargetImage, kernelSize, 0);
            cv.GaussianBlur(screenshotGray, cvScreenshot, kernelSize, 0);

            targetGray.delete();
            screenshotGray.delete();

            // TM_SQDIFF_NORMED - best min
            // TM_CCOEFF_NORMED - best max
            const matchResult = new cv.Mat();
            const matchedMask = new cv.Mat();
            // Set a threshold for a good match (adjust as needed)
            const threshold = 0.8;
            const color = new cv.Scalar(0, 255, 0, 255);

            cv.matchTemplate(cvScreenshot, cvTargetImage, matchResult, cv.TM_CCOEFF_NORMED, matchedMask);

            await renderImage(cvTargetImage, "opencv-target-canvas");
            // await renderImage(cvScreenshot, "opencv-screenshot-canvas");
            // await renderImage(copyForResult, "opencv-screenshot-canvas");

            // const result = cv.minMaxLoc(matchResult, null);
            // const minPoint = result.minLoc;
            // const maxPoint = result.maxLoc;

            // const rect = new cv.Rect(maxPoint.x, maxPoint.y, cvTargetImage.cols, cvTargetImage.rows);
            // const matchedCoordinate = new MatchCoord(maxPoint.x, maxPoint.y, result.maxVal, cvTargetImage.cols, cvTargetImage.rows);

            // debug("Min " + result.minVal);
            // debug("Max " + result.maxVal);
            // matchedCoordinate.draw(copyForResult);

            // Multiple matches
            const matches = FastGetMatchedCoordinates(matchResult, cvTargetImage, threshold);

            debug("All matches " + matches.length);

            matches.map(match => {
                match.draw(copyForResult);
            });

            await renderImage(copyForResult, "opencv-screenshot-canvas");

            copyForResult.delete();
            matchResult.delete();
            cvTargetImage.delete();
            cvScreenshot.delete();
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
 * @param nonNormalized Material containing scores
 * @param threshold Minimal score to collect in range 0-1
 * @param region search region
 * @returns a list of matchs
 */
export function getScoreMaxOpenCv4Node(nonNormalized: cv.Mat, threshold: number, region?: cv.Rect): Array<[number, number, number]> {
    const scoreMat = NormalizedMaterialValues(nonNormalized);

    if (scoreMat.dims !== 2)
        throw Error('Custom: this method can only be call on a 2 dimmention Mat. Found ' + scoreMat.dims);

    const out: Array<[number, number, number]> = [];
    const { cols, rows } = nonNormalized;

    // Data value type is depends on the Mat type.
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
    scoreMat.delete();
    return out;
}

/**
 * Fast match results using opencv binary thesholded material into rectangle contours, from matched material.
 * Currently only support Max normalized match result (TM_CCOEFF_NORMED) and cv.THRESH_BINARY thresholding.
 * @param matchResult multiple-channel, 8-bit or 32-bit floating point material 
 * @param cvTargetImage template image material
 * @param threshold value between 0 and 1.
 * @returns a list of matched rectangles
 */
export function FastGetMatchedCoordinates(matchResult: cv.Mat, cvTargetImage: cv.Mat, threshold: number): Array<MatchCoord> {
    const thresholded = new cv.Mat();

    // TODO: Add support for other thresholding methods such as 
    // cv.THRESH_BINARY requires additional max value.
    // cv.THRESH_BINARY_INV requires additional max value.
    // cv.THRESH_TRUNC
    // cv.THRESH_TOZERO
    // cv.THRESH_OTSU requires single channel material.
    // cv.THRESH_TRIANGLE requires single channel material.

    cv.threshold(matchResult, thresholded, threshold, 1, cv.THRESH_BINARY);
    thresholded.convertTo(thresholded, cv.CV_8UC1);

    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();

    const result = new Array<MatchCoord>();

    // Requires binary images (thresholded)
    cv.findContours(thresholded, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    for (let i = 0; i < contours.size(); ++i) {
        const countour = contours.get(i).data32S; // Contains the points
        const x = countour[0];
        const y = countour[1];

        result.push(new MatchCoord(x, y, 1, cvTargetImage.cols, cvTargetImage.rows));
    }

    thresholded.delete();

    return result;
}

export function NormalizedMaterialValues(fromMat: cv.Mat): cv.Mat {

    const mat = new cv.Mat();

    fromMat.convertTo(mat, cv.CV_32FC1);

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
        let matRGBA: cv.Mat = null;

        debug("initial has channels " + initialMat.channels() + " colums " + initialMat.cols + " rows " + initialMat.rows + " type " + initialMat.type());

        let tempMat = new cv.Mat();
        if (initialMat.channels() === 1) {

            // matRGBA.cvtColor(opencv.COLOR_GRAY2RGBA);
            cv.cvtColor(initialMat, tempMat, cv.COLOR_GRAY2RGBA);
        }
        else {
            tempMat = initialMat.clone();
            // If using cv.imdecode from opencv4nodejs, so we need to convert from opencv4nodejs format (COLOR_BGR2RGBA)
            // matRGBA.cvtColor(opencv.COLOR_BGR2RGBA);
            // cv.cvtColor(initialMat, matRGBA, cv.COLOR_BGR2RGBA);
        }

        matRGBA = new cv.Mat();
        tempMat.convertTo(matRGBA, cv.CV_8UC4);
        tempMat.delete();

        if (initialMat.cols > 800) {
            // matRGBA = await matRGBA.rescaleAsync(0.5);
            cv.resize(matRGBA, matRGBA, new cv.Size(0, 0), 0.5, 0.5, cv.INTER_AREA);
        }
        debug("matRGBA channels " + matRGBA.channels() + " colums " + matRGBA.cols + " rows " + matRGBA.rows + " type " + matRGBA.type());

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


/** 
    * From cv.CVDataType
   export declare const CV_8U: CVDataType;
   export declare const CV_8UC1: CVDataType;
   export declare const CV_8UC2: CVDataType;
   export declare const CV_8UC3: CVDataType;
   export declare const CV_8UC4: CVDataType;
   export declare const CV_8S: CVDataType;
   export declare const CV_8SC1: CVDataType;
   export declare const CV_8SC2: CVDataType;
   export declare const CV_8SC3: CVDataType;
   export declare const CV_8SC4: CVDataType;
   export declare const CV_16U: CVDataType;
   export declare const CV_16UC1: CVDataType;
   export declare const CV_16UC2: CVDataType;
   export declare const CV_16UC3: CVDataType;
   export declare const CV_16UC4: CVDataType;
   export declare const CV_16S: CVDataType;
   export declare const CV_16SC1: CVDataType;
   export declare const CV_16SC2: CVDataType;
   export declare const CV_16SC3: CVDataType;
   export declare const CV_16SC4: CVDataType;
   export declare const CV_32S: CVDataType;
   export declare const CV_32SC1: CVDataType;
   export declare const CV_32SC2: CVDataType;
   export declare const CV_32SC3: CVDataType;
   export declare const CV_32SC4: CVDataType;
   export declare const CV_32F: CVDataType;
   export declare const CV_32FC1: CVDataType;
   export declare const CV_32FC2: CVDataType;
   export declare const CV_32FC3: CVDataType;
   export declare const CV_32FC4: CVDataType;
   export declare const CV_64F: CVDataType;
   export declare const CV_64FC1: CVDataType;
   export declare const CV_64FC2: CVDataType;
   export declare const CV_64FC3: CVDataType;
   export declare const CV_64FC4: CVDataType;
    */
function LogMaterialTypes() {

    const types = [
        cv.CV_8U, cv.CV_8UC1, cv.CV_8UC2, cv.CV_8UC3, cv.CV_8UC4,
        cv.CV_8S, cv.CV_8SC1, cv.CV_8SC2, cv.CV_8SC3, cv.CV_8SC4,
        cv.CV_16U, cv.CV_16UC1, cv.CV_16UC2, cv.CV_16UC3, cv.CV_16UC4,
        cv.CV_16S, cv.CV_16SC1, cv.CV_16SC2, cv.CV_16SC3, cv.CV_16SC4,
        cv.CV_32S, cv.CV_32SC1, cv.CV_32SC2, cv.CV_32SC3, cv.CV_32SC4,
        cv.CV_32F, cv.CV_32FC1, cv.CV_32FC2, cv.CV_32FC3, cv.CV_32FC4,
        cv.CV_64F, cv.CV_64FC1, cv.CV_64FC2, cv.CV_64FC3, cv.CV_64FC4
    ];

    const names = [
        "CV_8U", "CV_8UC1", "CV_8UC2", "CV_8UC3", "CV_8UC4",
        "CV_8S", "CV_8SC1", "CV_8SC2", "CV_8SC3", "CV_8SC4",
        "CV_16U", "CV_16UC1", "CV_16UC2", "CV_16UC3", "CV_16UC4",
        "CV_16S", "CV_16SC1", "CV_16SC2", "CV_16SC3", "CV_16SC4",
        "CV_32S", "CV_32SC1", "CV_32SC2", "CV_32SC3", "CV_32SC4",
        "CV_32F", "CV_32FC1", "CV_32FC2", "CV_32FC3", "CV_32FC4",
        "CV_64F", "CV_64FC1", "CV_64FC2", "CV_64FC3", "CV_64FC4"
    ];

    types.forEach((type, index) => {
        console.log(`Mat type ${names[index]}: ${type}`);
    });
}

function getMaterialTypeMap() {
    return new Map<number, cv.CVDataType>([
        [0, 'CV_8U'],
        [8, 'CV_8UC2'],
        [16, 'CV_8UC3'],
        [24, 'CV_8UC4'],
        [1, 'CV_8S'],
        [1, 'CV_8SC1'],
        [9, 'CV_8SC2'],
        [17, 'CV_8SC3'],
        [25, 'CV_8SC4'],
        [2, 'CV_16U'],
        [2, 'CV_16UC1'],
        [10, 'CV_16UC2'],
        [18, 'CV_16UC3'],
        [26, 'CV_16UC4'],
        [3, 'CV_16S'],
        [3, 'CV_16SC1'],
        [11, 'CV_16SC2'],
        [19, 'CV_16SC3'],
        [27, 'CV_16SC4'],
        [4, 'CV_32S'],
        [4, 'CV_32SC1'],
        [12, 'CV_32SC2'],
        [20, 'CV_32SC3'],
        [28, 'CV_32SC4'],
        [5, 'CV_32F'],
        [5, 'CV_32FC1'],
        [13, 'CV_32FC2'],
        [21, 'CV_32FC3'],
        [29, 'CV_32FC4'],
        [6, 'CV_64F'],
        [6, 'CV_64FC1'],
        [14, 'CV_64FC2'],
        [22, 'CV_64FC3'],
        [30, 'CV_64FC4'],
    ]);
}