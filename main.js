// Modules to control application life and create native browser window
const {
    app,
    BrowserWindow,
    ipcMain,
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

function handleTimeout(gameId) {
    // Notify the render process that we've disconnected from the game.
    mainWindow.webContents.send('disconnect', { id: gameId });

    // Clear any local state specific to the game.
    delete sockets[gameId];
    delete timeouts[gameId];
}

let mainWindow;
let sockets = {};
let buffers = {};
let timeouts = {};

// Create the main window and start the IPC server once Electron has finished
// initializing.
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
        () => { ipc.server.on('data', onGameMessage); },
    );

    ipc.server.start();
});

/**
 * Handles incoming packets from the game process(es).
 *
 * This function is called by the IPC server whenver a packet is received from
 * a running game proces. It handles reassembling packets into complete messages,
 * deserializing those messages into the JSON payload, and sending the message
 * to the render process.
 */
function onGameMessage(data, socket) {
    // It's possible that the main window has closed but we're still receiving
    // IPC messages, in which case we simply want to ignore incoming messages.
    if (mainWindow === null) { return; }

    // TODO: Do we need more than the port to identify the window? Probably, if
    // we want to support the editor working over the network.
    let gameId = socket.port;

    // Update the socket map for the game.
    sockets[gameId] = socket;

    // Reset the timeout since we recieved a message from the game.
    if (gameId in timeouts) {
        clearTimeout(timeouts[gameId]);
    }

    // Attempt to extract the next message from the buffer.
    //
    // If we have data from a previous packet, concatenate it with the new data.
    // Otherwise, just use the new data.
    let buffer;
    if (gameId in buffers) {
        let prev = buffers[gameId];
        delete buffers[gameId];
        buffer = Buffer.concat([prev, data]);
    } else {
        buffer = data;
    }

    // A single packet may contain multiple messages, so repeatedly pull any
    // complete messages from the buffer.
    while (true) {
        // Pull the next message from the buffered data, if any.
        let { message, remaining } = extractMessage(buffer);
        buffer = remaining;

        // If no message could be pulled from the buffer, stop parsing.
        if (message == null) { break; }

        // Send the message to the editor window.
        mainWindow.webContents.send('data', {
            id: gameId,
            data: message.data,
        });
        timeouts[gameId] = setTimeout(handleTimeout, 500, socket.port);
    }

    // If there was any remaining data after all messages were parsed, store that
    // data so that we can append the next packets we receive.
    if (buffer != null) {
        buffers[gameId] = buffer;
    }
}

// Handle messages coming in from the render process.
//
// When the user performs an edit action, the render process sends a message
// to the main process so that it can be forwarded to the appropriate game
// process. This method looks up the socket address for the target game, and
// then sends it to the game via the IPC server.
ipcMain.on('update-resource', (event, arg) => {
    let gameId = arg.gameId;
    if (!(gameId in sockets)) {
        return;
    }
    let socket = sockets[gameId];

    var message = {
        type: 'ResourceUpdate',
        id: arg.id,
        data: arg.data,
    };
    ipc.server.emit(socket, JSON.stringify(message) + '\f');
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
