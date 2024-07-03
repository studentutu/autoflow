import { Workflow } from './WorkflowClass';
import { alert, debug, error } from './alert';
import { WaitDto } from './Dtos';

export async function Wait(waitJson: WaitDto, context: Workflow) {
    if (context.Cancelled) {
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
        const abortController = new AbortController();
        const signal = abortController.signal;

        const timeoutId = setTimeout(() => {
            const found = context.AbortControllers.indexOf(abortController);
            if (found !== -1) {
                context.AbortControllers.splice(found, 1);
            }
            if (context.Cancelled) {
                clearTimeout(timeoutId);
                resolve();
                return;
            }

            resolve();
        }, toMs);

        signal.addEventListener("abort", () => {
            clearTimeout(timeoutId);
            const found = context.AbortControllers.indexOf(abortController);
            if (found !== -1) {
                context.AbortControllers.splice(found, 1);
            }
            resolve();
        }, { once: true });

        context.AbortControllers.push(abortController);
    });
}

exports.Wait = Wait;