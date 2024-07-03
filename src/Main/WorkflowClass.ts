import { screen } from 'electron';
import { alert, debug, error } from './alert';
import { Step } from './step';
import { WorkflowDto } from './Dtos';
import { UndoInput } from './simulate';

export class Workflow {
    // Original read-only data
    OriginalJsonString: string;
    OriginalJsonState: string;
    JsonData: WorkflowDto;

    // Mutable data
    NextStep: number;
    State: JSON;
    ScreenId: number;
    DisplaySize: Electron.Size;

    // Workflow state
    CurrentStepIndex: number;
    Running: boolean;
    Cancelled: boolean;
    // TODO: refactor use use AbortController instead of NodeJS.Timeout
    TimeoutIds: NodeJS.Timeout[];

    constructor(jsonStringData: string) {
        this.OriginalJsonString = jsonStringData;
    }

    cancelTimeouts() {

        debug("Cancelled");

        this.Cancelled = true;
        while (this.TimeoutIds.length > 0) {
            const timeoutId = this.TimeoutIds.pop();
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

        this.TimeoutIds = [];
        this.CurrentStepIndex = 0;

        debug("Started workflow!");

        this.Running = true;
        this.Cancelled = false;

        try {
            while (this.CurrentStepIndex > -1 && this.CurrentStepIndex < this.JsonData.Steps.length && !this.Cancelled) {
                const stepJson = this.JsonData.Steps[this.CurrentStepIndex];

                this.NextStep = this.CurrentStepIndex + 1;
                await Step.Run(stepJson, this);

                this.CurrentStepIndex = this.NextStep;
            }
        } catch (errorMsg) {
            console.error(errorMsg);
            error(errorMsg);

            this.Stop();
        }

        if (!this.Cancelled && this.CurrentStepIndex > -1) {
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

        if (this.Cancelled)
            return;

        debug("Stopped");
        this.cancelTimeouts();
        UndoInput();

        this.JsonData = null;
        this.State = null;
    }
}
