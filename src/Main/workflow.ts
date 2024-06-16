import { ipcMain } from 'electron';
import { alert, debug, displayLastMouseClick } from './alert';
import { Workflow } from './WorkflowClass';
import { GetLastMouseClick } from './simulate';

let currentWorkflow: Workflow = null;

ipcMain.on("workflow-data", (event, stringJsonData) => {

  if (currentWorkflow != null)
    currentWorkflow.Stop();

  debug("Acquired new data!");
  currentWorkflow = new Workflow(stringJsonData);
});


ipcMain.on("start-workflow", (event, arg) => {

  if (currentWorkflow == null || currentWorkflow.OriginalJsonString == null) {
    alert("Please load data!");
    return;
  }

  currentWorkflow.Start();
});

ipcMain.on("stop-workflow", (event, arg) => {

  if (currentWorkflow != null) {
    currentWorkflow.Stop();
  }
});


ipcMain.on("notify-button-click", async (event, arg) => {

  const position = await GetLastMouseClick();
  displayLastMouseClick(position);
});