import { Workflow } from './WorkflowClass';
import { alert, debug, error } from './alert';
import { ModifyDto } from './Dtos';


export function Modify(modifyJson: ModifyDto, context: Workflow) {

    if (context.cancelled)
        return;

    // Validate and handle potential errors
    if (!modifyJson) {
        error('Missing conditionJson argument for Condition action.');
        context.NextStep = -1;
        return;
    }

    debug("In modify" + JSON.stringify(modifyJson));

    if (modifyJson.StateProperty === undefined || modifyJson.NewValue === undefined) {
        error('Invalid modifyJson: StateProperty and NewValue should be string.');
        context.NextStep = -1;
        return;
    }

    if (typeof modifyJson.StateProperty !== 'string') {
        error('Invalid modifyJson: StateProperty should be string.');
        context.NextStep = -1;
        return;
    }

    if (typeof modifyJson.NewValue !== 'string') {
        error('Invalid modifyJson: NewValue should be string.');
        context.NextStep = -1;
        return;
    }

    const state = context.State;
    const propertyName = modifyJson.StateProperty;

    if (!Object.keys(state).includes(propertyName)) {
        error("Invalid state: State should contain property" + propertyName);

        context.NextStep = -1;
        return;
    }

    const variableValue: any = state[propertyName];
    const evaluateExpression = modifyJson.NewValue.replace("var", variableValue);

    // Use a try-catch block to handle potential errors during evaluation
    try {
        const newValue = eval(evaluateExpression);

        debug("Expression evaluated to " + newValue);

        state[propertyName] = newValue;

    } catch (errormsg) {

        console.error(errormsg);
        error(errormsg);

        context.NextStep = -1;
        return;
    }
}

exports.Modify = Modify;