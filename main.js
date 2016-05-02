'use strict';

const electron = require('electron');

// Module to control application life.
const app = electron.app;

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

var path = require('path');

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
  mainWindow = new BrowserWindow({width: 1000, height: 600});
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


// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.on('ready', function(){
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
