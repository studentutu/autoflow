export class WorkflowDto {
    // Read-only data
    Steps: StepDto[];

    // Mutable data
    State: JSON;
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

export class KeyboardInputDto {
    /**
     * Type for key presses.
     * Defaults to 'keyDown' if not provided.
     */
    type: 'keyDown' | 'keyUp';

    /** 
     * Key to be pressed.
     * Should correspond to a Key from @kirillvakalov/nut-tree__nut-js.
     */
    key: string;

    /**
     * Optional, if set, will simulate key/mouse down hold for specified seconds.
     */
    hold: number;

    /**
     * Optional property for whole sentence input.
     */
    sentence: string;
}

export class MouseInputDto {
    /** 
     * Use state property to determine if the mouse position should be taken from the state.
     * Property used to determine whether to use the current mouse state. 
     */
    UseMouseStateProperty: string;

    /** 
     * Coordinates for mouse actions. 
     * For example: {x: 200, y: 300} 
     */
    position: Vector2;

    /**
     * Number of mouse clicks.
     * Defaults to one click if not provided.
     */
    clicks: number;

    /**
     * Optional, if set, will simulate key/mouse down hold for specified seconds.
     */
    hold: number;

    /**
     * Drag mouse to specified coordinates.
     * Optional, defaults to false if not provided.
     */
    drag?: DragDto;

    /**
     * Mouse button to be used.
     * Defaults to 'left' if not provided.
     */
    button: 'left' | 'middle' | 'right';
}

export class DragDto {
    /**
     * Coordinates for mouse drag actions. 
     * For example: {x: 200, y: 300} 
     */
    delta: Vector2;
}

export class InputDto {
    keyboardInput?: KeyboardInputDto;
    mouseInput?: MouseInputDto;
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
