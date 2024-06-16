import { Button, Key } from "@kirillvakalov/nut-tree__nut-js";


export class WorkflowDto {
    State: JSON;
    Steps: StepDto[];
}

export class StepDto {
    Id: number;
    Action: "wait" | "goTo" | "input" | "finish" | "modify" | "check" | "detect";
    GoTo: GoToDto;
    Input: InputDto;
    Wait: WaitDto;
    Detect: DetectDto;
    Check: CheckDto;
    Modify: ModifyDto;
}

export class WaitDto {
    Seconds: number;
}

export class GoToDto {
    Id: number;
}


export class InputDto {
    UseMouseStateProperty: string;
    position: Vector2;
    clicks: number;
    hold: number; // Optional, if set, will simulate key/mouse down hold for specified seconds.
    button: 'left' | 'middle' | 'right'; // Optional, defaults to 'left'
    type: 'keyDown' | 'keyUp'; // Optional for key presses, defaults to 'keyDown'
    key: string; // Optional for key presses
    sentence: string; // Optional for whole sentence input
}

export class DetectDto {
    // Full path to image, should not contain any spaces. Example: c:\Users\userName\Downloads\images\cat.png
    ImagePath: string;

    // Optional, defaults to 'true'
    UseCenter: boolean;

    // Optional
    AddOffset: Vector2;

    // Should be unique for each image detection. Prefer to use image name.
    BooleanStateProperty: string;
    PositionAtStateProperty: string;
}

export class Vector2 {
    x: number;
    y: number;
}

export class CheckDto {
    // Custom property name inside your state
    StateProperty: string;

    // Any valid boolean condition will be evaluated, var will be replaced by the current StateProperty value
    // "var > 0" or "var < 9" or "var == true" or "!var == true" etc.
    Condition: string;

    // Required.
    IdWhenTrue: number;

    // Required.
    IdWhenFalse: number;
}

export class ModifyDto {
    // Custom property name inside your state
    StateProperty: string;

    // Required.
    // Any valid expression here, var will be replaced by the current StateProperty value
    // "var +1" or "var--" or "42" or "true" or "false" etc.
    NewValue: string;
}
