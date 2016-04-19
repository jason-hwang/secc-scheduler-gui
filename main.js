'use strict';

const electron = require('electron');

// Module to control application life.
const app = electron.app;

// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow;

var path = require('path');

// Server information
var SECC = require(path.join(__dirname, 'node_modules', 'secc', 'settings.json'));
var server = require(path.join(__dirname, 'node_modules', 'secc', 'lib', 'scheduler'))(SECC);
var serverPort = SECC.scheduler.port;
var sockets = {};

// for menus
var Tray = require('tray');
var Menu = require('menu');
var iconPath = path.join(__dirname, 'icons', 'Icon.png');
var appIcon = null;
var contextMenu = null;

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

  // Emitted when the window is closed.
  mainWindow.on('closed', function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

function createMenuBar() {
  appIcon = new Tray(iconPath);
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

function destroyAllSockes() {
  for (var socketId in sockets) {
    console.log('socket', socketId, 'destroyed');
    sockets[socketId].destroy();
  }
}

function startSheduler(port) {
  if (!server.listening) {
    server.listen(port, function () {
      var host = server.address().address;
      var port = server.address().port;

      console.log('secc-scheduler listening at http://%s:%s', host, port);

      contextMenu.items[0].checked = true;
    });

    var nextSocketId = 0, sockets = {};

    server.on('connection', function (socket) {
      // Add a newly connected socket
      var socketId = nextSocketId++;
      sockets[socketId] = socket;
      console.log('socket', socketId, 'opened');

      // Remove the socket when it closes
      socket.on('close', function () {
        console.log('socket', socketId, 'closed');
        delete sockets[socketId];
      });

    });
  }
}

function stopSheduler() {
  contextMenu.items[1].checked = true;

  // Before close is called, it check handle===0 && connections===0.
  // If connections exist, do not working close event.
  server.getConnections(function(err, count) {
    console.log("connections:"+count);

    if (count) {
      destroyAllSockes();

      server.close(function(){
        console.log("Closed Server");
      });
    }
  });

}


ipcMain.on('start-scheduler', function(event, port) {
  startSheduler(port);
  event.sender.send('start-scheduler-callback');
});

ipcMain.on('stop-scheduler', function(event, arg) {
  stopSheduler();
  event.sender.send('stop-scheduler-callback');
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
