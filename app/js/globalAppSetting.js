/**
 * Global App Settings
 * - event binding
 * - IPC call request & define IPC Callback method
 * - Tab event
 */

define(function(){
  var app = {
    init: function() {
      var ipcRenderer = require('electron').ipcRenderer;
      var webview = document.querySelector("#scheduler-view");
      var start = document.querySelector('#scheduler-start');
      var stop = document.querySelector('#scheduler-stop');
      var serverPort = document.querySelector('#scheduler-port');
      var snackbarContainer = document.querySelector('#toast-msg');

      var emptyPageAddress = "about:blank;"
      var schedulerAddress = "http://localhost"

      var startMessage = "Server is running : )";
      var stopMessage = "Server is stopping : (";

      var uploadPathField = document.querySelector('#upload-path-field');
      var uploadPathBtn = document.querySelector('#upload-path-btn');
      var uploadPathOpen = document.querySelector('#open-upload-path');
      var archivePathField = document.querySelector('#archive-path-field');
      var archivePathBtn = document.querySelector('#archive-path-btn');
      var archivePathOpen = document.querySelector('#open-archive-path');

      var envPathSave = document.querySelector('#env-path-save');
      var envPathReset = document.querySelector('#env-path-reset');

      start.onclick = function() {
        ipcRenderer.send('start-scheduler', serverPort.value);
      }

      stop.onclick = function() {
        ipcRenderer.send('stop-scheduler');
      }

      uploadPathBtn.onclick = function() {
        ipcRenderer.send('open-file-explorer', 'upload');
      }

      archivePathBtn.onclick = function() {
        ipcRenderer.send('open-file-explorer', 'archive'); 
      }

      envPathSave.onclick = function() {
        ipcRenderer.send('save-env-path', { 
          uploadPath: uploadPathField.value,
          archivePath: archivePathField.value
        });
        showMessage("save env paths.")
      }

      envPathReset.onclick = function() {
        ipcRenderer.send('reset-env-path');
        console.log("reset env paths.");
      }

      uploadPathOpen.onclick = function() {
        ipcRenderer.send('open-env-path', 'upload');
      }

      archivePathOpen.onclick = function() {
        ipcRenderer.send('open-env-path', 'archive');
      }

      function changeWebViewURL(address) {
        webview.setAttribute('src', address);
        console.log("Change Address : " + address);
      }

      function closeDrawerMenu() {
        var drawerMenu = document.querySelector(".mdl-layout__drawer");
        var obfuscator = document.querySelector(".mdl-layout__obfuscator");
        drawerMenu.classList.remove("is-visible");
        obfuscator.classList.remove("is-visible");
      }

      function changeSchedulerStatus(flag) {
        var changedURL = '';
        var msg = null;
        var startBtnVisible = '';
        var stopBtnVisible = '';

        if (flag === 'start') {
          changedURL = schedulerAddress+":"+serverPort.value;
          msg = startMessage;
          startBtnVisible = 'display:none;';
          stopBtnVisible = 'display:block;';
        } else {
          changedURL = emptyPageAddress;
          msg = stopMessage;
          startBtnVisible = 'display:block';
          stopBtnVisible = 'display:none';
        }

        changeWebViewURL(changedURL);
        start.setAttribute('style', startBtnVisible);
        stop.setAttribute('style', stopBtnVisible);
        showMessage(msg);
      }

      function showMessage(msg) {
        snackbarContainer.MaterialSnackbar.showSnackbar({message:msg});
      }

      // This function called by menubar start event on Main Process
      ipcRenderer.on('call-start-scheduler', function(evnet, arg) {
        ipcRenderer.send('start-scheduler', serverPort.value);
      });

      // This function called by menubar stop event on Main Process
      ipcRenderer.on('call-stop-scheduler', function(event, arg) {
        ipcRenderer.send('stop-scheduler');
      });

      // This function called by 'start-scheduler' ipc event on Main Process
      ipcRenderer.on('start-scheduler-callback', function(event, arg) {
        changeSchedulerStatus('start');
        closeDrawerMenu();
      });

      // This function called by 'stop-scheduler' ipc event on Main Process
      ipcRenderer.on('stop-scheduler-callback', function(event, arg) {
        changeSchedulerStatus('stop');
        closeDrawerMenu();
      });

      // This function called by 'check-scheduler-running' ipc event on Main Process
      ipcRenderer.on('check-scheduler-running-callback', function(event, server) {
        if (server) {
          changeSchedulerStatus('start');
        }
      });

      // This function called by 'check-scheduler-running' ipc event on Main Process
      ipcRenderer.on('get-scheduler-settings-callback', function(event, settings) {
        uploadPathField.value = settings.uploadPath;
        archivePathField.value = settings.archivePath;

        console.log('uploadPath:', settings.uploadPath);
        console.log('archivePath:', settings.archivePath);
      });

      // This function called by 'check-scheduler-running' ipc event on Main Process
      ipcRenderer.on('open-file-explorer-callback', function(event, obj) {
        if (typeof obj.path === 'undefined') {
          console.log("Not selected..");
          return;
        }

        if (obj.type === 'upload') {
          uploadPathField.value = obj.path;
        } else if (obj.type === 'archive') {
          archivePathField.value = obj.path;
        }
      });

      // for gui
      function clearIsActive(customTabs) {
        for (var i=0; i<customTabs.length; i++) {
          customTabs[i].classList.remove("is-active");
        }
      }

      function changeMainTitle(title) {
        document.querySelector("#main-header-title").innerHTML = title;
      }

      var customTabs = document.querySelectorAll(".mdl-custom-tab");
      var customTabPanels = document.querySelectorAll(".mdl-layout__tab-panel");

      // register event
      for(var i=0; i<customTabs.length; i++) {
        (function(idx) {
            customTabs[idx].onclick = function() {
              clearIsActive(customTabPanels);
              customTabPanels[idx].classList.add("is-active");
              changeMainTitle(customTabs[idx].getAttribute("title"));
              closeDrawerMenu();
            }
        })(i);
      }

      ipcRenderer.send('check-scheduler-running');
      ipcRenderer.send('get-scheduler-settings');
    }
  }

  return app;
});
