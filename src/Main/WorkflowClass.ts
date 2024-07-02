import { screen } from 'electron';
import { alert, debug, error } from './alert';
import { Step } from './step';
import { WorkflowDto } from './Dtos';
import { UndoInput } from './simulate';

export class Workflow {
    OriginalJsonString: string;
    OriginalJsonState: string;
    JsonData: WorkflowDto;
    State: JSON;
    Running: boolean;
    cancelled: boolean;
    NextStep: number;
    ScreenId: number;
    DisplaySize: Electron.Size;

    // TODO: refactor use use AbortController instead of NodeJS.Timeout
    timeoutIds: NodeJS.Timeout[];
    currentStepIndex: number;

    constructor(jsonStringData: string) {
        this.OriginalJsonString = jsonStringData;
    }

    cancelTimeouts() {

        debug("Cancelled");

        this.cancelled = true;
        while (this.timeoutIds.length > 0) {
            const timeoutId = this.timeoutIds.pop();
            if (timeoutId !== undefined)
                clearTimeout(timeoutId);
        }
    }

    async Start() {

        if (this.OriginalJsonString == null) {
            alert("Please load data!");
            return;
        }

        const cursor = screen.getCursorScreenPoint();
        const targetScreen = screen.getDisplayNearestPoint({ x: cursor.x, y: cursor.y });
        this.ScreenId = targetScreen.id;
        this.DisplaySize = targetScreen.workAreaSize;

        this.JsonData = JSON.parse(this.OriginalJsonString);
        this.State = this.JsonData.State;
        this.OriginalJsonState = JSON.stringify(this.JsonData.State);

        this.timeoutIds = [];
        this.currentStepIndex = 0;

        debug("Started workflow!");

        this.Running = true;
        this.cancelled = false;

        try {
            while (this.currentStepIndex > -1 && this.currentStepIndex < this.JsonData.Steps.length && !this.cancelled) {
                const stepJson = this.JsonData.Steps[this.currentStepIndex];

                this.NextStep = this.currentStepIndex + 1;
                await Step.Run(stepJson, this);

                this.currentStepIndex = this.NextStep;
            }
        } catch (errorMsg) {
            console.error(errorMsg);
            error(errorMsg);

            this.Stop();
        }

        if (!this.cancelled && this.currentStepIndex > -1) {
            console.log("Pipeline finished successfully");
            debug("Pipeline finished successfully");
        }

        this.Stop();
    }

    Stop() {

        if (this.OriginalJsonString == null)
            return;

        if (!this.Running)
            return;

        if (this.cancelled)
            return;

        debug("Stopped");
        this.cancelTimeouts();
        UndoInput();

        this.JsonData = null;
        this.State = null;
    }
}
