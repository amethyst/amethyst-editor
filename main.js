// Modules to control application life and create native browser window
const {
    app,
    BrowserWindow,
} = require('electron');
const ipc = require('node-ipc');

function createWindow() {
    // Create the browser window.
    let window = new BrowserWindow({
        width: 800,
        height: 600
    });

    // and load the index.html of the app.
    window.loadFile('index.html');

    return window;
}

function handleTimeout(windowId) {
    window.webContents.send('disconnect', { id: windowId });
    delete timeouts[windowId];
}

let window;
let timeouts = {};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    window = createWindow();

    ipc.config.id = 'world';
    ipc.config.retry = 1500;
    ipc.config.silent = true;

    ipc.serveNet(
        'udp4',
        function() {
            ipc.server.on(
                'message',
                function(data, socket) {
                    let windowId = socket.port;

                    // Reset the timeout since we recieved a message from the game.
                    if (windowId in timeouts) {
                        clearTimeout(timeouts[windowId]);
                        window.webContents.send('update', {
                            id: windowId,
                            data: data,
                        });
                    } else {
                        window.webContents.send('connect', {
                            id: windowId,
                            data: data,
                        });
                    }
                    timeouts[windowId] = setTimeout(handleTimeout, 500, socket.port);
                }
            );
        }
    );

    ipc.server.start();
});

// Quit when all windows are closed.
app.on('window-all-closed', function() {
    // On OS X it is common for applications and their menu bar
    // to stay active until the user quits explicitly with Cmd + Q
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', function() {
    // On OS X it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (mainWindow === null) {
        createWindow();
    }
});
