import { mouse, Button, straightTo, keyboard, Key, Point, } from "@kirillvakalov/nut-tree__nut-js";
import { alert, debug, error } from './alert';
import { Workflow } from "./WorkflowClass";
import { InputDto, Vector2 } from "./Dtos";


let undoAction: () => Promise<void>;

// Function to simulate mouse clicks and key presses
export async function SimulateRobot(options: InputDto, context: Workflow) {

    if (context.cancelled) {
        return Promise.resolve();
    }
    debug("In simulation " + JSON.stringify(options));

    // Validate and handle potential errors in options
    if (!options) {
        error('Missing options argument for Simulate function.');
        context.NextStep = -1;
        return;
    }

    // TODO: Add support for multi screen.
    const targetScreen = context.ScreenId;

    let position: Vector2 = options.position;
    const mouseStateProperty = options.UseMouseStateProperty;
    if (mouseStateProperty !== undefined && Object.keys(context.State).includes(mouseStateProperty)) {
        const valueInState = context.State[mouseStateProperty];
        position = valueInState;
    }

    const { clicks, button, type, key, hold, sentence } = options;

    // Validate coordinates (if provided)
    if (position !== undefined) {
        if (typeof position.x !== 'number' || typeof position.y !== 'number') {
            error('Invalid input coordinates: x and y must be numbers.');
            context.NextStep = -1;
            return;
        }
    }

    // Validate clicks (if provided)
    if (clicks !== undefined) {
        if (typeof clicks !== 'number' || clicks < 1) {
            error('Invalid input clicks: must be a positive integer.');
            context.NextStep = -1;
            return;
        }
    }

    // Validate button (if provided)
    let actualButton: Button;
    if (button !== undefined) {
        if (typeof button !== 'string') {
            error('Invalid input button: must be a valid robotjs button name.');
            context.NextStep = -1;
            return;
        }
        // This will have type 'Key'

        try {

            // **Caution!** This might throw an error at runtime if the string doesn't match an enum member
            actualButton = button.toUpperCase as unknown as Button;
        } catch {
            error('Invalid input button: must be a valid mouse button name (left or middle or right).');
            context.NextStep = -1;
            return;
        }
    }

    // Validate type (if provided)
    if (type !== undefined) {
        if (typeof type !== 'string' || !['keyDown', 'keyUp'].includes(type)) {
            error('Invalid input type: must be "keyDown" or "keyUp".');
            context.NextStep = -1;
            return;
        }
    }

    // Validate key (if provided for key presses)
    let actualKey: Key;
    if (type === 'keyDown' || type === 'keyUp') {
        if (!key) {
            error('Invalid input Missing key argument for key presses.');
            context.NextStep = -1;
            return;
        }
        try {

            // **Caution!** This might throw an error at runtime if the string doesn't match an enum member
            actualKey = key.toUpperCase as unknown as Key;
        } catch {
            error('Invalid input button: must be a valid mouse button name (see Keys).');
            context.NextStep = -1;
            return;
        }
    }

    // Validate hold
    let useHold = false;
    if (hold !== undefined) {

        useHold = true;
        if (typeof hold !== 'number') {
            error('Invalid input hold: must be number.');
            context.NextStep = -1;
            return;
        }
    }

    try {
        // Simulate mouse clicks based on options
        if (position !== undefined) {
            await straightTo(new Point(position.x, position.y));
        }

        if (!useHold) {
            // Simulate key presses based on options
            if (type && actualKey != null) {
                keyboard.config.autoDelayMs = null;
                if (type == "keyDown")
                    await keyboard.pressKey(actualKey);
                else
                    await keyboard.releaseKey(actualKey);
            }

            if (clicks) {
                let repeat = clicks;
                mouse.config.autoDelayMs = 0;
                while (repeat > 0) {
                    repeat--;
                    await mouse.click(actualButton || Button.LEFT);
                }
            }

            if (sentence) {
                await keyboard.type(sentence);
            }

            return Promise.resolve();
        } else {

            const seconds = hold;
            const toMs = seconds * 1000;

            if (clicks) {
                mouse.config.autoDelayMs = 0;
                await mouse.pressButton(actualButton || Button.LEFT);
            }

            // Simulate key hold based on options
            if (actualKey) {
                await keyboard.pressKey(actualKey);
            }

            return new Promise<void>((resolve, reject) => {

                undoAction = async function () {
                    if (actualKey) {
                        await keyboard.releaseKey(actualKey);
                    }

                    if (clicks) {
                        await mouse.releaseButton(actualButton || Button.LEFT);
                    }
                    undoAction = null;
                };

                const timeoutId = setTimeout(() => {

                    UndoInput();
                    if (context.cancelled) {
                        clearTimeout(timeoutId); // Clear timeout if cancelled during wait
                        resolve();
                        return;
                    }

                    // Remove timeout when successful
                    context.timeoutIds.splice(context.timeoutIds.indexOf(timeoutId), 1);
                    resolve();
                }, toMs);

                context.timeoutIds.push(timeoutId);
            });
        }

    } catch (error) {
        error('Error during simulation:' + error);
    }
}

exports.SimulateRobot = SimulateRobot;


export async function GetLastMouseClick() {
    const pos = await mouse.getPosition();

    return {
        x: pos.x,
        y: pos.y
    };
}

exports.GetLastMouseClick = GetLastMouseClick;

export async function UndoInput() {
    if (undoAction !== undefined)
        await undoAction();
}

exports.UndoInput = UndoInput;