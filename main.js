// Modules to control application life and create native browser window
const {
    app,
    BrowserWindow,
} = require('electron');
const ipc = require('node-ipc');

// Dictionary of active window objects, with the key being the port the window is connected from.
// Windows are removed from the dictionary when they close.
let windows = {};

function getOrCreateWindow(port) {
    // If there is already a window for the specified port, fetch it from `windows`.
    if (port in windows) {
        return windows[port];
    }

    // Create the browser window.
    let window = new BrowserWindow({
        width: 800,
        height: 600
    });

    // and load the index.html of the app.
    window.loadFile('index.html');

    windows[port] = window;

    // Emitted when the window is closed.
    window.on('closed', function() {
        delete windows[port];
    });

    return window;
}

function handleTimeout(port) {
    if (port in windows) {
        windows[port].close();
    }
}

// Handle the 'windows-all-closed' event to prevent the default behavior of
// quitting the application when all windows have closed. We want the main
// process to continue to run in the background so that we can automatically
// open editor windows as the user launches their game.
app.on('window-all-closed', function() {});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', () => {
    ipc.config.id = 'world';
    ipc.config.retry = 1500;
    ipc.config.silent = true;

    ipc.serveNet(
        'udp4',
        function() {
            ipc.server.on(
                'message',
                function(data, socket) {
                    let window = getOrCreateWindow(socket.port);
                    window.webContents.send('message', data);

                    // Reset the timeout since we recieved a message from the game.
                    if ('timeout' in window) {
                        clearTimeout(window.timeout);
                    }
                    window.timeout = setTimeout(handleTimeout, 500, socket.port);
                }
            );
        }
    );

    ipc.server.start();
});
