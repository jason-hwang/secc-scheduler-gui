'use strict';

const electron = require('electron');

// Module to control application life.
const app = electron.app;
const userDataPath = app.getPath('userData');

const storage = require('electron-json-storage');

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

var path = require('path');
var debug = require('debug');

// Server information
var SECC = require('./node_modules/secc/settings.json');
var scheduler = require('./node_modules/secc/lib/scheduler')(SECC);
var serverPort = SECC.scheduler.port;

// for menus
var Tray = require('tray');
var Menu = require('menu');
var iconOnPath = path.join(__dirname, 'icons', 'icon_on.png');
var iconOffPath = path.join(__dirname, 'icons', 'icon_off.png');
var appIcon = null;
var contextMenu = null;

const _START = 0;
const _STOP = 1;

// for ipc
var ipcMain = electron.ipcMain;

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow;

function createWindow () {
  mainWindow = new BrowserWindow({width: 1000, height: 600, minWidth:1000, minHeight:600});
  mainWindow.loadURL('file://' + path.join(__dirname, 'app', 'index.html'));

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  var handleRedirect = (e, url) => {
    if(url != mainWindow.webContents.getURL()) {
      e.preventDefault();
      require('electron').shell.openExternal(url);
    }
  }

  mainWindow.webContents.on('will-navigate', handleRedirect);
  mainWindow.webContents.on('new-window', handleRedirect);

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    mainWindow = null;
  });
}

function createMenuBar() {
  appIcon = new Tray(iconOffPath);
  contextMenu = Menu.buildFromTemplate([
    {
      label: 'Start',
      type: 'radio',
      click: function(arg){
        // Request start event on Renderer Process
        mainWindow.webContents.send('call-start-scheduler');
      }
    },
    {
      label: 'Stop',
      type: 'radio',
      checked: true,
      click: function() {
        // Request start event on Renderer Process
        mainWindow.webContents.send('call-stop-scheduler');
      }
    },
    { label: 'Quit',
      accelerator: 'Command+Q',
      selector: 'terminate:',
    }
  ]);

  appIcon.setToolTip('This is Secc GUI Scheduler');
  appIcon.setContextMenu(contextMenu);
}

function changeTrayIconStatus(status) {
  if (status === 'start') {
    appIcon.setImage(iconOnPath);
    contextMenu.items[_START].checked = true;
  } else {
    appIcon.setImage(iconOffPath);
    contextMenu.items[_STOP].checked = true;
  }
}


function startSheduler(port, successCallback) {
  //set custom port
  setSchedulerPort(port);
  

  scheduler.startServer(function(msg) {
    console.log(msg);
    
    // Change tray server state
    changeTrayIconStatus('start');
    successCallback();

  }, function(msg) {
    console.log(msg);
  });
}

function stopSheduler(successCallback) {
    scheduler.stopServer(function(msg) {
      console.log(msg);

      // Change tray server state
      changeTrayIconStatus('stop');
      successCallback();

    }, function(msg) {
      console.log(msg);
    });
}

function setSchedulerPort(port) {
  SECC.scheduler.port = port;
}

function initDefaultAppSettings(callback) {
  var settings = new Object();

  settings.appDataPath = path.join(userDataPath);
  settings.uploadPath = path.join(userDataPath, 'uploads');
  settings.archivePath = path.join(userDataPath, 'archive');

  var fs = require('fs');

  if (!fs.existsSync(settings.appDataPath)){
    fs.mkdirSync(settings.appDataPath);
  }

  if (!fs.existsSync(settings.uploadPath)){
    fs.mkdirSync(settings.uploadPath);
  }

  if (!fs.existsSync(settings.archivePath)){
    fs.mkdirSync(settings.archivePath);
  }

  // Write
  storage.set('settings', settings, function(err) {
    if (err) throw error;
    console.log("Set Default App Settings");
    SECC.uploadPath = settings.uploadPath;
    SECC.archivePath = settings.archivePath;
    debug(SECC);

    if (callback) {
      callback();
    }
  });
}

function getAppSettings() {
  console.log("Get App Settings");
  storage.get('settings', function(err, settings) {
    if (err) throw error;

    if (!settings.hasOwnProperty('archivePath')) {
      console.log("There is no app settings.");
      initDefaultAppSettings();
    } else {
      SECC.uploadPath = settings.uploadPath;
      SECC.archivePath = settings.archivePath;
      debug(SECC);
    }
  });
}


function setAppSettings(uploadPath, archivePath) {
  var settings = new Object();
  settings.uploadPath = uploadPath;
  settings.archivePath = archivePath;

  // Write
  storage.set('settings', settings, function() {
    console.log("Set App Settings");
    SECC.uploadPath = settings.uploadPath;
    SECC.archivePath = settings.archivePath;
  });
}


function removeAppSettings(callback) {
  storage.remove('settings', function(error) {
    if (error) throw error;
    if (callback) {
      callback();
    }
  });
}


ipcMain.on('start-scheduler', function(event, port) {
  startSheduler(port, function() {
    event.sender.send('start-scheduler-callback');
  });
});

ipcMain.on('stop-scheduler', function(event, arg) {
  stopSheduler(function() {
    event.sender.send('stop-scheduler-callback');
  });
});

ipcMain.on('check-scheduler-running', function(event, arg) {
  event.sender.send('check-scheduler-running-callback', scheduler.server);
});

ipcMain.on('get-scheduler-settings', function(event, arg) {
  event.sender.send('get-scheduler-settings-callback', {
      uploadPath: SECC.uploadPath,
      archivePath: SECC.archivePath
    });
});

ipcMain.on('open-file-explorer', function(event, type) {
  const dialog = electron.dialog;
  const directoryPath = dialog.showOpenDialog({ 
    properties: [ 'openDirectory']
  });

  event.sender.send('open-file-explorer-callback', { 
      type: type, 
      path: directoryPath
    });
});

ipcMain.on('save-env-path', function(event, paths) {
  setAppSettings(paths.uploadPath, paths.archivePath);
});

ipcMain.on('reset-env-path', function(event, arg) {
  removeAppSettings(function() {
    initDefaultAppSettings(function() {
      event.sender.send('get-scheduler-settings-callback', {
        uploadPath: SECC.uploadPath,
        archivePath: SECC.archivePath
      });
    });  
  });
});

ipcMain.on('open-env-path', function(event, type) {
  var openPath = '';

  if (type === 'upload') {
    openPath = SECC.uploadPath;
  } else if (type === 'archive') {
    openPath = SECC.archivePath;
  } else {
    debug("Unkown type.");
    return;
  }

  const shell = electron.shell;
  shell.showItemInFolder(openPath);
});


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function(){
  getAppSettings();
  createWindow();
  createMenuBar();
});

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});
