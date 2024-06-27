import { ipcMain } from 'electron';
import { alert, debug, displayLastMouseClick } from './alert';
import { Workflow } from './WorkflowClass';
import { GetLastMouseClick } from './simulate';
import * as TestOpenCv from './testopencv';

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

ipcMain.on("check-opencv", async (event, arg) => {

  const testOpenCv = TestOpenCv.GetCurrentTest();
  await testOpenCv.CheckWithOpenCv();
});

ipcMain.on("change-target-image", async (event, arg) => {

  const test = TestOpenCv.GetCurrentTest();
  await test.ChangeTargetImage(arg);
});

ipcMain.on("change-screenshot-image", async (event, arg) => {

  const testOpenCv = TestOpenCv.GetCurrentTest();
  await testOpenCv.ChangeScreenshotImage(arg);
});