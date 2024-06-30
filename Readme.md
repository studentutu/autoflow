# Autoworkflow

Authohotkey alternative for those who like simplicity of js.
Automatic os-wide pipeline for your needs with image detection and input simulation based on your custom json steps and state with support for a fully evaluated expressions and conditions.
Automate UI as never before.

Powered by electron, robotjs an opencv.

## Contents

- [Installation](#installation)
- [Workflow overview](#workflow-overview)
- [Actions](#actions)
  - [Wait Action, seconds as double/float/integer](#wait-action-seconds-as-doublefloatinteger)
  - [Finish Action, which stops execution and finishes workflow](#finish-action-which-stops-execution-and-finishes-workflow)
  - [Input Action](#input-action)
  - [Detect image action](#detect-image-action)
  - [Condition check action, check condition on value in custom state](#condition-check-action-check-condition-on-value-in-custom-state)
  - [GoTo, go to step with specified id](#goto-go-to-step-with-specified-id)
  - [Modify value in custom state](#modify-value-in-custom-state)
- [Building](#building)
  - [Pre-requisites](#pre-requisites)
  - [Run](#run)
  - [Package](#package)
- [TODO](#todo)
- [Contributions](#contributions)

## Installation

Download build for your platform from release page.

## Workflow overview

Create your_custom_workflow.json based on the following examples [testPipeline](./examples/test.json).
Workflow consists of list of Steps and custom State.
Step is an action. See list of supported [actions](#actions)
State consists of any user defined properties.
Note: some of the properties are required by the actions.

Your workflow will look something like this:

```json
{
    "Steps": [
        {
            "Id": 0,
            "Action": "wait",
            "Wait": {
                "Seconds": 1.0
            }
        },
        {
            "Id": 1,
            "Action": "finish"
        }
    ],
     "State": {
        "comment": "This is custom state variables, only boolean / numbers are supported.",
        "CurrentMoveVector": 0,
        "MaxMoveRadius": 30
    }
}
```

## Actions

### Wait Action, seconds as double/float/integer

 ```json
    {
        "Id": number,
        "Action": "wait",
        "Wait": {
            "Seconds": 1.0
        }
    }
```

### Finish Action, which stops execution and finishes workflow

 ```json
    {
        "Id": number,
        "Action": "finish",
    }
```

### Input Action

```json
   {
        "Id": number,
        "Action": "input",
        "Input": {
            // Optional. Use in conjuction with Detect in order to click onto detected image.
            "UseMouseStateProperty": string,

            // If UseStateProperty is present, will use that value here
            "position": {
                "x": 500,
                "y": 500
            },
            "clicks": 1,

            "hold": 0.5, // Optional, if set, will simulate key/mouse down hold.

            // Optional, defaults to 'left' click.
            "button": 'right' or 'left', 

            // Optional for key presses, defaults to 'keyDown'
            "type": 'keyDown' or 'keyUp',

            // Optional for key presses
            "key": 'a' or 'enter'
        }
    }
```

### Detect image action

```json
   {
        "Id": number,
        "Action": "detect",
        "Detect":
        {
            // Full path to image, should not contain any spaces. Example: c:\Users\userName\Downloads\images\cat.png
            "ImagePath": string, 

            // Optional, defaults to 'true'
            "UseCenter": boolean,

            // Optional
            "AddOffset": Vector2, 

            // Should be unique for each image detection. Prefer to use image name.
            "BooleanStateProperty": string,
            "PositionAtStateProperty": string
        }
    }
```

### Condition check action, check condition on value in custom state

```json
   {
        "Id": number,
        "Action": "check",
        "Check": 
        {
            // Custom property name inside your state
            "StateProperty": string, 

            // Any valid boolean condition evaluated here, var will be replaced by the current StateProperty value
            // "var > 0" or "var < 9" or "var == true" or "!var == true" etc.
            "Condition": string, 

            // Required.
            "IdWhenTrue" : number,
            // Required.
            "IdWhenFalse" : number
        }
    }
```

### GoTo, go to step with specified id

```json
   {
        "Id": number,
        "Action": "goTo",
        "GoTo" : {
            "Id": number
        }
    }
```

### Modify value in custom state

```json
   {
        "Id": number,
        "Action": "modify",
        "Modify":
        {
            // Custom property name inside your state
            "StateProperty" : string,
            
            // Required.
            // Any valid expression here, var will be replaced by the current StateProperty value
            // "var + 1" or "var--" or "42" or "true" or "false" or "{ "anotherJson" : 42 }" etc.
            "NewValue": string
        }
    }
```

## Building

### Pre-requisites

- nvm
- node 20x
- yarn

Do a single restore of dependencies:

```bash
    yarn install 
```

### Run

Run:

``` bash
yarn start
```

### Package

Run with command for each platform:
npm run make

## TODO

- [x] String state property support
- [x] Add Input hold into input action
- [x] Image template detection
- [ ] Packages for (linux /macos /windows)
- [ ] Visualization graph tool
- [ ] Workflow Graph design tool
- [ ] Graph design export into .json
- [ ] Fetch action integration
- [x] Use more reliable and feature rich key/mouse input simulation nut-js
- [x] Use better opencv package ( so that there is no additional build or setup needed)
- [ ] Multi screen support

## Contributions

Help to grow this project with your contributions.
