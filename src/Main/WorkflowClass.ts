import { screen } from 'electron';
import { alert, debug, error } from './alert';
import { Step } from './step';
import { WorkflowDto } from './Dtos';
import { UndoInput } from './simulate';

export class Workflow {
    // Original read-only data
    OriginalJsonString: string;

    // Mutable data
    NextStep: number;
    State: JSON;
    ScreenId: number;
    DisplaySize: Electron.Size;

    // Workflow state
    JsonData: WorkflowDto;
    CurrentStepIndex: number;
    Running: boolean;
    Cancelled: boolean;
    AbortControllers: AbortController[];

    constructor(jsonStringData: string) {
        this.OriginalJsonString = jsonStringData;
    }

    cancelTimeouts() {
        debug("Cancelled");

        this.Cancelled = true;
        while (this.AbortControllers.length > 0) {
            const abortController = this.AbortControllers.pop();
            if (abortController !== undefined && abortController != null) {
                abortController.abort();
            }
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

        this.AbortControllers = [];
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
