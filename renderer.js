const { ipcRenderer } = require('electron');
const clamp = require('clamp');

// Load custom components.
require('./components/data-display.js');

const MAX_LOGS = 500;

let app = new Vue({
    el: '#app',

    data: {
        // Capture data about the Electron process so that we can display it in the app if we want.
        process: process,

        // A map containing the data for each game currently connected to the editor.
        gameIds: [],
        games: {},
        activeGameIndex: 0,

        // The list of tabs that are available for each game. Each game tracks its own state for
        // which tab is currently selected.
        tabs: [
            'Entities',
            'Resources',
            'Log',
        ],
    },

    methods: {
        selectGame: function(index) {
            this.activeGameIndex = index;
        },

        selectEntity: function(entity) {
            let gameId = this.gameIds[this.activeGameIndex];
            this.games[gameId].selectedEntity = entity;
        },

        selectTab: function(index) {
            let gameId = this.gameIds[this.activeGameIndex];
            this.games[gameId].activeTab = index;
        },

        activeGameId: function() {
            return this.gameIds[this.activeGameIndex];
        },

        activeGame: function() {
            return this.games[this.activeGameId()];
        },
    }
});
exports.app = app;

ipcRenderer.on('disconnect', (event, data) => {
    var index = app.gameIds.indexOf(data.id);
    if (index !== -1) {
        // Remove the game's data from the set of games.
        Vue.delete(app.games, data.id);

        // Remove the game ID from the list of game IDs.
        app.gameIds.splice(index, 1);

        // Update the index of the currently active game tab if selected tab was after the
        // removed tab.
        if (index < app.activeGameIndex) {
            app.activeGameIndex -= 1;
        }
        app.activeGameIndex = clamp(app.activeGameIndex, 0, app.gameIds.length - 1);

        console.log(`Disconnected from ${data.id}, active game is now ${app.activeGameIndex}, current game IDs`, app.gameIds);
    } else {
        console.log(`Disconnected from ${data.id} but game was not in list of game IDs`, app.gameIds);
    }
});

ipcRenderer.on('data', (event, data) => {
    if (data.id in app.games) {
        let game = app.games[data.id];
        game.update(data.data);
    } else {
        console.log('Connected to new game:', data);

        app.gameIds.push(data.id);

        let game = {
            gameId: data.id,
            entities: [],
            components: [],
            resources: [],
            logs: [],
            rawComponents: null,
            selectedEntity: null,
            activeTab: 0,

            update: function(data) {
                if (data.entities != null) {
                    this.entities = data.entities;
                }

                if (data.components != null) {
                    // Sort components before updating the local data to ensure that components always appear
                    // in the same order regardless of the order they are sent in.
                    var sortedComponents = data.components;
                    sortedComponents.sort(compareNamed);
                    this.components = sortedComponents;
                }

                if (data.resources != null) {
                    // Sort resources before updating the local data to ensure that resources always appear
                    // in the same order regardless of the order they are sent in.
                    var sortedResources = data.resources;
                    sortedResources.sort(compareNamed);
                    this.resources = sortedResources;
                }

                if (data.messages != null) {
                    for (message of data.messages) {
                        if (message.type === 'log') {
                            this.insertLog(message.data);
                        }
                    }
                }
            },

            insertLog: function(log) {
                if (this.logs.length >= MAX_LOGS) {
                    this.logs.shift();
                }
                this.logs.push(log);
            },

            entityHasTags: function(entity) {
                for (component of this.components) {
                    if (component.data[entity] === null) {
                        return true;
                    }
                }

                return false
            },

            editResource: function(id, data) {
                console.log(`Edited resource ${id} in game ${this.gameId}:`, data);

                ipcRenderer.send('update-resource', {
                    gameId: this.gameId,
                    id: id,
                    data: data,
                });
            },
        };
        game.update(data.data);

        Vue.set(app.games, data.id, game);
    }
});

/**
 * Compares two objects by name, returning a numeric value based on their relative ordering.
 *
 * Useful for sorting a list of objects by their name, rather than their natural ordering.
 */
function compareNamed(left, right) {
    if (left.name < right.name) { return -1; }
    if (left.name > right.name) { return 1; }
    return 0;
}
