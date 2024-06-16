import { Workflow } from './WorkflowClass';
import { alert, debug, error } from './alert';
import { CheckDto } from './Dtos';

export function ConditionCheck(conditionJson: CheckDto, context: Workflow) {

    if (context.cancelled)
        return;

    // Validate and handle potential errors
    if (!conditionJson) {
        error('Missing conditionJson argument for Condition action.');
        context.NextStep = -1;
        return;
    }

    debug("In condition" + JSON.stringify(conditionJson));

    if (conditionJson.StateProperty === undefined || conditionJson.Condition === undefined) {
        error('Invalid conditionJson: StateProperty and Condition should be string.');
        context.NextStep = -1;
        return;
    }

    if (typeof conditionJson.StateProperty !== 'string') {
        error('Invalid conditionJson: StateProperty should be string.');
        context.NextStep = -1;
        return;
    }

    if (typeof conditionJson.Condition !== 'string') {
        error('Invalid conditionJson: Condition should be string.');
        context.NextStep = -1;
        return;
    }

    const state = context.State;
    const propertyName = conditionJson.StateProperty;

    if (!Object.keys(state).includes(propertyName)) {
        error("Invalid state: State should contain property" + propertyName);

        context.NextStep = -1;
        return;
    }

    const variableValue: any = state[propertyName];

    const IdWhenTrue = conditionJson.IdWhenTrue;
    const IdWhenFalse = conditionJson.IdWhenFalse;
    if (IdWhenTrue === undefined) {
        error("Invalid conditionJson: IdWhenTrue should be number");

        context.NextStep = -1;
        return;
    }

    if (IdWhenFalse === undefined) {
        error("Invalid conditionJson: IdWhenFalse should be number");

        context.NextStep = -1;
        return;
    }

    const condition = conditionJson.Condition.replace("var", variableValue);

    // Use a try-catch block to handle potential errors during evaluation
    try {
        // Evaluate the condition using eval
        const passed = eval(condition);

        debug("Condition evaluated to " + passed);

        if (passed) {
            context.NextStep = IdWhenTrue;
        } else {
            context.NextStep = IdWhenFalse;
        }
    } catch (errormsg) {

        console.error(errormsg);
        error(errormsg);

        context.NextStep = -1;
        return;
    }
}

exports.ConditionCheck = ConditionCheck;