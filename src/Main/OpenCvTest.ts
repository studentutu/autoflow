import * as cv from 'opencv4nodejs-prebuilt-install';


export class TestOpenCv {

    ImageTargetMat: cv.Mat;
    ImageScreenshotMat: cv.Mat;

    async CheckWithOpenCv() {

        if (this.ImageTargetMat === undefined || this.ImageTargetMat == null)
            return;

        if (this.ImageScreenshotMat === undefined || this.ImageScreenshotMat == null)
            return;

        const cvScreenshot = await this.ImageScreenshotMat.cvtColorAsync(cv.COLOR_RGB2GRAY);
        const cvTargetImage = await this.ImageTargetMat.cvtColorAsync(cv.COLOR_RGB2GRAY);

        const result = cvScreenshot.matchTemplate(cvTargetImage, cv.TM_CCOEFF_NORMED);
    }
}

export class MatchCoord {
    x: number;
    y: number;
    value: number;
    width: number;
    height: number;

    constructor(x: number, y: number, value: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.width = width;
        this.height = height;
    }

    prettyString() {
        return `${this.x}x${this.y} scode:${this.value}`;
    }

    draw(mat) {
        const rect = new cv.Rect(this.x, this.y, this.width, this.height);
        // rect = rect.pad(1.8);
        const color = new cv.Vec3(0, 255, 0);
        mat.drawRectangle(rect, color, 2);
    }
}