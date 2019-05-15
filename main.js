const prompts = require('prompts');
const fs = require('fs');
const path = require('path');
const pako = require('pako');

let programSettings = {
    folders: {
        input: "./input/",
        output: "./output/"
    },
    mapObjectIDs: {
        enabled: false,
        file: ""
    },
    mapNPCIDs: {
        enabled: false,
        file: ""
    },
    keyNames: {
        tiles: "tiles",
        width: "width",
        height: "height",
        depth: "depth",
        objects: "objects",
        objectList: {
            id: "id",
            x: "x",
            y: "y",
            prop: "prop",
            type: "type"
        },
        units: "units",
        unitList: {
            id: "id",
            x: "x",
            y: "y",
            prop: "prop",
            type: "type"
        },
        doors: "doors",
        doorsList: {
            id: "id",
            x: "x",
            y: "y",
            prop: "prop",
            type: "type",
            tile: "tile"
        },
        interactables: "interactables",
        interactablesList: {
            id: "id",
            x: "x",
            y: "y",
            prop: "prop",
            type: "type",
            tile: "tile",
            use: "use"
        },
        medals: "medals",
        medalsList: {
            id: "id",
            x: "x",
            y: "y",
            prop: "prop",
            type: "type"
        },
        stairs: "stairs",
        stairsList: {
            id: "id",
            x: "x",
            y: "y",
            prop: "prop",
            type: "type",
            tile: "tile",
            use: "use"
        },
        tileset: "tileset",
        traps: "traps",
        trapsList: {
            id: "id",
            x: "x",
            y: "y",
            prop: "prop",
            type: "type",
        }
    },
    defaultTileset: "tilemap1",
    verbosity: 3,
    readFromFile: false
}

function clearConsole(){
    console.log('\033[2J');
}

async function convertMaps(){
    let list = getMapList();

    for(let i = 0; i < list.length; i++){
        let idx = parseIDX(list[i]);
        let map = parseMap(list[i], idx);
        let obj = parseObj(list[i]);

        let output = Object.assign({}, idx, map, obj);
        output.tileset = programSettings.defaultTileset;

        await SaveJSON(programSettings.folders.output + list[i] + ".json", output);
    }
}

function convertFile(fileName){
    let fileData = fs.readFileSync(programSettings.folders.input + fileName);
    fileData = new Uint8Array(fileData);
    fileData = new Int32Array(pako.inflate(fileData).buffer);
    return fileData;
}

async function getJSON(path){
    return new Promise((resolve, reject) => {
        fs.readFile(path, function(err, data){
            if(data) resolve(JSON.parse(data));
            else resolve(undefined);
        })
    })
}

function getObjectList(fileData){
    let current = {};
    let objList = [];

    for(let i = 0; i < fileData.length; i++){
        if(i % 5 == 0) {
            if(fileData[i] == 0) {
                i += 4;
                continue;
            }
            current = new Object();
            current.id = fileData[i];
        }
        if(i % 5 == 1) current.x = fileData[i];
        if(i % 5 == 2) current.y = fileData[i];
        if(i % 5 == 3) current.prop = fileData[i];
        if(i % 5 == 4) {
            current.type = fileData[i];
            objList.push(current);
        }
    }

    return objList;
}

function getMapList(){
    let rawList = fs.readdirSync(programSettings.folders.input);
    let nameList = [];
    let validList = [];
    let invalidList = [];

    for(let i = 0; i < rawList.length; i++){
        let fname = path.parse(rawList[i]).name;
        if(nameList.indexOf(fname) == (-1)) nameList.push(fname);
    }

    for(let i = 0; i < nameList.length; i++){
        if(
            rawList.indexOf(nameList[i] + ".idx") != (-1) &&
            rawList.indexOf(nameList[i] + ".map") != (-1) &&
            rawList.indexOf(nameList[i] + ".obj") != (-1)
        ) {
            validList.push(nameList[i]);
        } else {
            invalidList.push(nameList[i]);
        }
    }


    if(programSettings.verbosity >= 3){
        console.log("Found a total of " + nameList.length + " maps.");
        console.log("Of those, " + validList.length + " were valid and " + invalidList.length + " was/were invalid.");
        if(invalidList.length > 0 ) console.log("Invalid maps: ", invalidList);
    }

    return validList;
}

async function handleOption(num){
    let type, name, message, validate;

    if(num == 4){
        convertMaps();
        return;
    }

    switch(num){
        case 1: 
            type = "text";
            name = "path";
            message = "Enter the path of the input folder.",
            validate = pathExists
            break;
        case 2:
            type = "text";
            name = "path";
            message = "Enter the path of the output folder.",
            validate = pathExists
            break;
        case 3:
            type = "text";
            name = "value";
            message = "Enter the id string for the tilemap.",
            validate = () => {return true;};
            break;
    }


    let response = await prompts({
        type: type,
        name: name,
        message: message,
        validate: validate
    });

    switch(num){
        case 1: 
                programSettings.folders.input = response.path;
                break;
        case 2:
                programSettings.folders.output = response.path;
                break;
        case 3:
                programSettings.defaultTileset = response.value;
                break;
    }
}

function parseIDX(fileName){
    let fileData = convertFile(fileName + ".idx");
    let idxData = {};

    idxData[programSettings.keyNames.width] = fileData[0];
    idxData[programSettings.keyNames.height] = fileData[1];
    idxData[programSettings.keyNames.depth] = fileData[2];
    return idxData;
}

function parseMap(fileName, dim){
    let fileData = convertFile(fileName + ".map");
    let mapData = {};

    mapData[programSettings.keyNames.tiles] = Array.prototype.slice.call(fileData.slice(0, dim[programSettings.keyNames.width] * dim[programSettings.keyNames.height]));
    
    return mapData;
}

function parseObj(fileName){
    let rawData = convertFile(fileName + ".obj");
    let objList = getObjectList(rawData);
    let objData = {};
    let current = {};

    objData[programSettings.keyNames.objects] = [];
    objData[programSettings.keyNames.doors] = [];
    objData[programSettings.keyNames.interactables] = [];
    objData[programSettings.keyNames.medals] = [];
    objData[programSettings.keyNames.stairs] = [];
    objData[programSettings.keyNames.traps] = [];
    objData[programSettings.keyNames.units] = [];

    for(let i = 0; i < objList.length; i++){
        current = {};

        if(objList[i].type == 0){
            current[programSettings.keyNames.objectList.id] = objList[i].id;
            current[programSettings.keyNames.objectList.x] = objList[i].x;
            current[programSettings.keyNames.objectList.y] = objList[i].y;
            current[programSettings.keyNames.objectList.prop] = objList[i].prop;
            current[programSettings.keyNames.objectList.type] = objList[i].type;
            objData[programSettings.keyNames.objects].push(current);
            continue;
        }

        if(objList[i].type == 1){
            current[programSettings.keyNames.unitList.id] = objList[i].id;
            current[programSettings.keyNames.unitList.x] = objList[i].x;
            current[programSettings.keyNames.unitList.y] = objList[i].y;
            current[programSettings.keyNames.unitList.prop] = objList[i].prop;
            current[programSettings.keyNames.unitList.type] = objList[i].type;
            objData[programSettings.keyNames.units].push(current);
            continue;
        }

        if(objList[i].type == 2){
            if([0,1,2,7,11,13].indexOf(objList[i].id) != (-1)){
                current[programSettings.keyNames.doorsList.id] = objList[i].id;
                current[programSettings.keyNames.doorsList.x] = objList[i].x;
                current[programSettings.keyNames.doorsList.y] = objList[i].y;
                current[programSettings.keyNames.doorsList.prop] = objList[i].prop;
                current[programSettings.keyNames.doorsList.type] = objList[i].type;

                if([0,1,2].indexOf(objList[i].id) != (-1)){
                    current[programSettings.keyNames.doorsList.tile] = 726;
                }

                if(objList[i].id == 7){
                    current[programSettings.keyNames.doorsList.tile] = 728;
                }

                if(objList[i].id == 11){
                    current[programSettings.keyNames.doorsList.tile] = 730;
                }

                if(objList[i].id == 13){
                    current[programSettings.keyNames.doorsList.tile] = 733;
                }

                objData[programSettings.keyNames.doors].push(current);
                continue;
            }

            if(objList[i].id == 3 || objList[i].id == 4){
                current[programSettings.keyNames.trapsList.id] = objList[i].id;
                current[programSettings.keyNames.trapsList.x] = objList[i].x;
                current[programSettings.keyNames.trapsList.y] = objList[i].y;
                current[programSettings.keyNames.trapsList.prop] = objList[i].prop;
                current[programSettings.keyNames.trapsList.type] = objList[i].type;
                objData[programSettings.keyNames.traps].push(current);
                continue;
            }

            if(objList[i].id == 5 || objList[i].id == 6){
                current[programSettings.keyNames.stairsList.id] = objList[i].id;
                current[programSettings.keyNames.stairsList.x] = objList[i].x;
                current[programSettings.keyNames.stairsList.y] = objList[i].y;
                current[programSettings.keyNames.stairsList.prop] = objList[i].prop;
                current[programSettings.keyNames.stairsList.type] = objList[i].type;

                if(objList[i].id == 5) {
                    current[programSettings.keyNames.stairsList.use] = "up";
                    current[programSettings.keyNames.stairsList.tile] = 232;
                }

                if(objList[i].id == 6) {
                    current[programSettings.keyNames.stairsList.use] = "down";
                    current[programSettings.keyNames.stairsList.tile] = 231;
                }

                objData[programSettings.keyNames.stairs].push(current);
                continue;
            }

            if(objList[i].id == 10){
                current[programSettings.keyNames.medalsList.id] = objList[i].id;
                current[programSettings.keyNames.medalsList.x] = objList[i].x;
                current[programSettings.keyNames.medalsList.y] = objList[i].y;
                current[programSettings.keyNames.medalsList.prop] = objList[i].prop;
                current[programSettings.keyNames.medalsList.type] = objList[i].type;
                objData[programSettings.keyNames.medals].push(current);
                continue;
            }

            if([8, 9, 12].indexOf(objList[i].id) != (-1)){
                current[programSettings.keyNames.interactablesList.id] = objList[i].id;
                current[programSettings.keyNames.interactablesList.x] = objList[i].x;
                current[programSettings.keyNames.interactablesList.y] = objList[i].y;
                current[programSettings.keyNames.interactablesList.prop] = objList[i].prop;
                current[programSettings.keyNames.interactablesList.type] = objList[i].type;

                if(objList[i].id == 8){
                    current[programSettings.keyNames.interactablesList.tile] = 727;
                    current[programSettings.keyNames.interactablesList.use] = "Bulletin Board";
                }

                if(objList[i].id == 9){
                    current[programSettings.keyNames.interactablesList.tile] = 729;
                    current[programSettings.keyNames.interactablesList.use] = "Ballot Box";
                }

                if(objList[i].id == 12){
                    current[programSettings.keyNames.interactablesList.tile] = 732;
                    current[programSettings.keyNames.interactablesList.use] = "City Board";
                }

                objData[programSettings.keyNames.interactables].push(current);
                continue;
            }

            if(programSettings.verbosity > 0){
                console.log("Found an unknown object id.", objList[i]);
            }
        }
    }
    return objData;
}

function pathExists(path){
    if(fs.existsSync(path)) return true;
    else return "Path " + path + " does not exist."
}

function printMenu(){
    console.log(
        "****************************************************************************" + "\n" +
        "*** Input folder: " + programSettings.folders.input + "\n" +
        "*** Output folder: " + programSettings.folders.output + "\n" +
        "*** Tilemap (CANNOT BE READ FROM MAP FILES): " + programSettings.defaultTileset + "\n" +
        "*** Imported settings from file: " + programSettings.readFromFile + "\n" +
        "***\n" +
        "*** 0) Exit application." + "\n" +
        "*** 1) Change input folder." + "\n" +
        "*** 2) Change output folder." + "\n" + 
        "*** 3) Change tilemap." + "\n" +
        "*** 4) Start conversion." + "\n" +
        "****************************************************************************" + "\n"
    );
}

async function SaveJSON(path, towrite){
    return new Promise((resolve, reject) => {
        fs.writeFile(path, JSON.stringify(towrite), "utf8", () => {
            resolve();
        })
    })
}

function validateOption(value){
    if(value < 0 || value > 4) return "Please choose a valid option.";
    else return true;
}
 
(async () => {
    let response = -1;
    let option = -1;

    if(pathExists("./config.json")){
        let params = await getJSON("./config.json");
        programSettings = params;
        programSettings.readFromFile = true;
    }

    while(option != 0 && option != 4){
        clearConsole();
        printMenu();
        getMapList();
        response = await prompts({
            type: 'number',
            name: 'value',
            message: 'Select an option.',
            validate: validateOption
        });
        option = response.value;

        if(option != 0) await handleOption(option);
    }
})();