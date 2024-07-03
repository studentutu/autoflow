import { alert, debug, error } from './alert';
import { Wait } from './wait';
import { ConditionCheck } from './condition';
import { Modify } from './modify';
import { Workflow } from './WorkflowClass';
import { StepDto } from './Dtos';
import { SimulateInput } from './simulate';


export class Step {

    static async Run(jsonStep: StepDto, workflowContext: Workflow) {

        if (workflowContext.Cancelled)
            return;

        const actionAsString = jsonStep.Action.trim().toLowerCase();
        switch (actionAsString) {
            case "wait":

                await Wait(jsonStep.Wait, workflowContext);
                break;

            case "goto":

                debug("Go to: " + jsonStep.GoTo.Id);
                workflowContext.NextStep = jsonStep.GoTo.Id;
                break;

            case "input":

                await SimulateInput(jsonStep.Input, workflowContext);
                break;

            case "check":

                ConditionCheck(jsonStep.Check, workflowContext);
                break;

            case "detect":

                // TODO: add detect action (based on opencv image template)
                // await DetectImage(jsonStep.Detect, workflowContext);
                break;

            case "modify":

                Modify(jsonStep.Modify, workflowContext);
                break;

            case "finish":

                debug("Finished!");
                break;
            default:
                console.error("Unknown action " + jsonStep.Id, actionAsString);
                error("Unknown action " + jsonStep.Id + " " + actionAsString);
                workflowContext.Stop();
                return;
        }
    }
}

exports.Step = Step;
