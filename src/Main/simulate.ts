import { mouse, Button, straightTo, keyboard, Key, Point } from "@kirillvakalov/nut-tree__nut-js";
import { alert, debug, error } from './alert';
import { Workflow } from "./WorkflowClass";
import { InputDto, Vector2, KeyboardInputDto, MouseInputDto } from "./Dtos";

let undoMouseAction: () => Promise<void>;
let undoKeyboardAction: () => Promise<void>;

export async function SimulateInput(options: InputDto, context: Workflow): Promise<void> {
    if (context.Cancelled) {
        return Promise.resolve();
    }

    debug("In simulation " + JSON.stringify(options));

    if (!options) {
        error('Missing options argument for Simulate function.');
        context.NextStep = -1;
        return;
    }

    try {
        if (options.mouseInput) {
            await handleMouseInput(options.mouseInput, context);
        }

        if (context.Cancelled) {
            UndoInput();
            context.NextStep = -1;
            return;
        }

        if (options.keyboardInput) {
            await handleKeyboardInput(options.keyboardInput, context);
        }
    } catch (err) {
        error('Error during simulation: ' + err);
        context.NextStep = -1;
    }
}

async function handleMouseInput(mouseInput: MouseInputDto, context: Workflow): Promise<void> {
    let position: Vector2 = mouseInput.position;
    const mouseStateProperty = mouseInput.UseMouseStateProperty;

    if (mouseStateProperty !== undefined && Object.keys(context.State).includes(mouseStateProperty)) {
        const valueInState = context.State[mouseStateProperty];
        position = valueInState;
    }

    if (position !== undefined) {
        if (typeof position.x !== 'number' || typeof position.y !== 'number') {
            error('Invalid input coordinates: x and y must be numbers.');
            context.NextStep = -1;
            return;
        }
    }

    if (mouseInput.clicks !== undefined) {
        if (typeof mouseInput.clicks !== 'number' || mouseInput.clicks < 1) {
            error('Invalid input clicks: must be a positive integer.');
            context.NextStep = -1;
            return;
        }
    }

    let actualButton: Button;
    if (mouseInput.button !== undefined) {
        if (typeof mouseInput.button !== 'string') {
            error('Invalid input button: must be a valid robotjs button name.');
            context.NextStep = -1;
            return;
        }

        try {
            const parsedKey = mouseInput.button.toUpperCase() as keyof (typeof Button);
            actualButton = Button[parsedKey];
        } catch {
            error('Invalid input button: must be a valid mouse button name (left, middle, right).');
            context.NextStep = -1;
            return;
        }
    }

    let useHold = false;
    if (mouseInput.hold !== undefined) {
        useHold = true;
        if (typeof mouseInput.hold !== 'number') {
            error('Invalid input hold: must be number.');
            context.NextStep = -1;
            return;
        }
    }

    try {

        if (position !== undefined && mouseInput.drag === undefined) {
            await straightTo(new Point(position.x, position.y));
        }

        if (context.Cancelled) {
            UndoInput();
            context.NextStep = -1;
            return;
        }

        if (!useHold) {
            if (mouseInput.clicks) {
                let repeat = mouseInput.clicks;
                mouse.config.autoDelayMs = 5;
                while (repeat > 0 && !context.Cancelled) {
                    repeat--;
                    await mouse.click(actualButton || Button.LEFT);
                }
            }
            return;
        } else {

            const seconds = mouseInput.hold;
            const toMs = seconds * 1000;

            if (mouseInput.clicks) {
                mouse.config.autoDelayMs = 0;
                await mouse.pressButton(actualButton || Button.LEFT);
            }

            undoMouseAction = async function () {
                undoMouseAction = null;
                if (mouseInput.clicks) {
                    await mouse.releaseButton(actualButton || Button.LEFT);
                }
            };
            const abortController = new AbortController();
            const signal = abortController.signal;

            const timeoutPromise = new Promise<void>((resolve, _) => {
                const timeoutId = setTimeout(() => {
                    UndoInput();
                    const found = context.AbortControllers.indexOf(abortController);
                    if (found !== -1) {
                        context.AbortControllers.splice(found, 1);
                    }
                    if (context.Cancelled) {
                        clearTimeout(timeoutId);
                        resolve();
                        return;
                    }

                    resolve();
                }, toMs);

                signal.addEventListener("abort", () => {
                    UndoInput();
                    clearTimeout(timeoutId);
                    const found = context.AbortControllers.indexOf(abortController);
                    if (found !== -1) {
                        context.AbortControllers.splice(found, 1);
                    }
                    resolve();
                }, { once: true });

                context.AbortControllers.push(abortController);
            });

            return Promise.race([MoveMouseAsync(mouseInput, context, timeoutPromise), timeoutPromise]);
        }
    } catch (err) {
        error('Error during mouse simulation: ' + err);
        context.NextStep = -1;
        return;
    }
}

async function MoveMouseAsync(mouseInput: MouseInputDto, context: Workflow, setupTimeout: Promise<void>): Promise<void> {
    if (mouseInput.drag === undefined) {
        return setupTimeout;
    }

    const initialPosition = await mouse.getPosition();
    const seconds = mouseInput.hold;
    const delta = mouseInput.drag.delta;

    if (typeof delta.x !== 'number' || typeof delta.y !== 'number') {
        error('Invalid input drag: x and y must be numbers.');
        context.NextStep = -1;
        UndoInput();
        return;
    }

    if (seconds !== undefined && typeof seconds !== 'number') {
        error('Invalid input drag: seconds must be a number.');
        context.NextStep = -1;
        UndoInput();
        return;
    }

    const endPosition = new Point(initialPosition.x + delta.x, initialPosition.y + delta.y);
    const points = generatePoints(initialPosition, endPosition, seconds || 0.5);

    const avg = (delta.x / seconds + delta.y / seconds) * 0.5;
    mouse.config.mouseSpeed = avg;

    let currentPoint = initialPosition;

    for (const point of points) {
        if (context.Cancelled) {
            UndoInput();
            return;
        }
        await mouse.move([currentPoint, point]);
        currentPoint = point;
    }

    if (context.Cancelled) {
        UndoInput();
        return;
    }
}

// New method to generate points based on the initial position, end position, and duration
function generatePoints(initialPosition: Point, endPosition: Point, seconds: number): Point[] {
    const deltaTime: number = 1 / 30;
    const points: Point[] = [];
    const totalSteps = Math.ceil(seconds / deltaTime);
    const deltaX = (endPosition.x - initialPosition.x) / totalSteps;
    const deltaY = (endPosition.y - initialPosition.y) / totalSteps;

    for (let i = 0; i <= totalSteps; i++) {
        points.push(new Point(initialPosition.x + deltaX * i, initialPosition.y + deltaY * i));
    }

    return points;
}

async function handleKeyboardInput(keyboardInput: KeyboardInputDto, context: Workflow): Promise<void> {
    if (keyboardInput.type !== undefined) {
        if (typeof keyboardInput.type !== 'string' || !['keyDown', 'keyUp'].includes(keyboardInput.type)) {
            error('Invalid input type: must be "keyDown" or "keyUp".');
            context.NextStep = -1;
            return;
        }
    }

    let actualKey: Key;
    if (keyboardInput.type === 'keyDown' || keyboardInput.type === 'keyUp') {
        if (!keyboardInput.key) {
            error('Invalid input: Missing key argument for key presses.');
            context.NextStep = -1;
            return;
        }

        try {
            const parsedKey = keyboardInput.key.toUpperCase() as keyof (typeof Key);
            actualKey = Key[parsedKey];
        } catch {
            error('Invalid input key: must be a valid key name (see Keys).');
            context.NextStep = -1;
            return;
        }
    }

    let useHold = false;
    if (keyboardInput.hold !== undefined) {
        useHold = true;
        if (typeof keyboardInput.hold !== 'number') {
            error('Invalid input hold: must be number.');
            context.NextStep = -1;
            return;
        }
    }

    try {
        if (!useHold) {
            keyboard.config.autoDelayMs = 200;
            if (keyboardInput.type && actualKey) {
                await keyboard.pressKey(actualKey);
                await keyboard.releaseKey(actualKey);
            }

            if (context.Cancelled) {
                return;
            }

            if (keyboardInput.sentence) {
                await keyboard.type(keyboardInput.sentence);
            }
            return;
        } else {
            const seconds = keyboardInput.hold;
            const toMs = seconds * 1000;
            keyboard.config.autoDelayMs = 0;

            if (actualKey) {
                await keyboard.pressKey(actualKey);
            }

            undoKeyboardAction = async function () {
                undoKeyboardAction = null;
                if (actualKey) {
                    await keyboard.releaseKey(actualKey);
                }
            };

            return new Promise<void>((resolve, _) => {
                const abortController = new AbortController();
                const signal = abortController.signal;

                const timeoutId = setTimeout(() => {
                    UndoInput();
                    const found = context.AbortControllers.indexOf(abortController);
                    if (found !== -1) {
                        context.AbortControllers.splice(found, 1);
                    }
                    if (context.Cancelled) {
                        clearTimeout(timeoutId);
                        resolve();
                        return;
                    }

                    resolve();
                }, toMs);

                signal.addEventListener("abort", () => {
                    UndoInput();
                    clearTimeout(timeoutId);
                    const found = context.AbortControllers.indexOf(abortController);
                    if (found !== -1) {
                        context.AbortControllers.splice(found, 1);
                    }
                    resolve();
                }, { once: true });

                context.AbortControllers.push(abortController);
            });
        }
    } catch (err) {
        error('Error during keyboard simulation: ' + err);
        context.NextStep = -1;
        return;
    }
}

export async function GetLastMouseClick() {
    const pos = await mouse.getPosition();
    return {
        x: pos.x,
        y: pos.y
    };
}

export async function UndoInput() {
    if (undoKeyboardAction !== undefined && undoKeyboardAction !== null) {
        await undoKeyboardAction();
    }
    if (undoMouseAction !== undefined && undoMouseAction !== null) {
        await undoMouseAction();
    }
}

exports.UndoInput = UndoInput;