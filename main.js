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
    mainWindow.webContents.send('disconnect', { id: windowId });
    delete timeouts[windowId];
}

let mainWindow;
let timeouts = {};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    // Install the electron devtools for developoment builds.
    if (!app.isPackaged) {
        let installExtension = require('electron-devtools-installer')
          installExtension.default(installExtension.VUEJS_DEVTOOLS)
            .then(() => {})
            .catch(err => {
                console.log('Unable to install `vue-devtools`: \n', err)
            });
    }

    mainWindow = createWindow();

    let buffers = {};

    // Clear the global window reference when the window closes.
    mainWindow.on('closed', function() {
        mainWindow = null;
    });

    ipc.config.id = 'world';
    ipc.config.retry = 1500;
    ipc.config.rawBuffer = true;
    ipc.config.silent = true;

    ipc.serveNet(
        'udp4',
        function() {
            ipc.server.on(
                'data',
                function(data, socket) {
                    // It's possible that the main window has closed but we're still receiving
                    // IPC messages, in which case we simply want to ignore incoming messages.
                    if (mainWindow === null) { return; }

                    // TODO: Do we need more than the port to identify the window? Probably, if
                    // we want to support the editor working over the network.
                    let windowId = socket.port;

                    // Reset the timeout since we recieved a message from the game.
                    if (windowId in timeouts) {
                        clearTimeout(timeouts[windowId]);
                    }

                    // Attempt to extract the next message from the buffer.
                    //
                    // If we have data from a previous packet, concatenate it with the new data.
                    // Otherwise, just use the new data.
                    let buffer;
                    if (windowId in buffers) {
                        let prev = buffers[windowId];
                        delete buffers[windowId];
                        buffer = Buffer.concat([prev, data]);
                    } else {
                        buffer = data;
                    }

                    let { message, remaining } = extractMessage(buffer);

                    if (remaining != null) {
                        buffers[windowId] = remaining;
                    }

                    if (message != null) {
                        mainWindow.webContents.send('data', {
                            id: windowId,
                            data: message.data,
                        });
                        timeouts[windowId] = setTimeout(handleTimeout, 500, socket.port);
                    }
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

/**
 * Extracts the first message present in `buffer`, returning the message string
 * and the remaining portion of the buffer.
 */
function extractMessage(buffer) {
    let index = buffer.indexOf('\f');
    if (index >= 0) {
        let remaining;
        if (buffer.length > index) {
            remaining = buffer.slice(index + 1);
        }

        let messageString = buffer.toString('utf8', 0, index);

        try {
            let message = JSON.parse(messageString);
            return {
                message: message,
                remaining: remaining,
            };
        } catch (error) {
            return { remaining: remaining };
        }
    } else {
        return { remaining: buffer };
    }
}
