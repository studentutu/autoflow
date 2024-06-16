import { Workflow } from './WorkflowClass';
import { alert, debug, error } from './alert';
import { WaitDto } from './Dtos';


export async function Wait(waitJson: WaitDto, context: Workflow) {
    if (context.cancelled) {
        return Promise.resolve();
    }

    if (!waitJson || !Object.keys(waitJson).includes('Seconds')) {
        error('Invalid waitJson. Requires a "Seconds" property.');
        return;
    }

    if (typeof waitJson.Seconds !== 'number') {
        error('Invalid type: must be "Seconds" should be a number(float, double or integer)');
        return;
    }

    const seconds = waitJson.Seconds;
    const toMs = seconds * 1000;
    debug("In Wait " + JSON.stringify(waitJson));

    return new Promise<void>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
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

exports.Wait = Wait