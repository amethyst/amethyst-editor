const { ipcRenderer } = require('electron');
const VueJsonPretty = require('vue-json-pretty').default;

let app = new Vue({
    el: '#app',
    components: {
        VueJsonPretty,
    },

    data: {
        // Capture data about the Electron process so that we can display it in the app if we want.
        process: process,

        // A map containing the data for each game currently connected to the editor.
        games: {},

        // The list of tabs that are available for each game. Each game tracks its own state for
        // which tab is currently selected.
        tabs: [
            'Entities',
            'Resources',
        ],
    },

    methods: {
        selectEntity: function(entity) {
            this.selectedEntity = entity;
        },

        selectTab: function(index) {
            this.activeTab = index;
        }
    }
});
exports.app = app;

ipcRenderer.on('connect', (event, data) => {
    app.games[data.id] = {
        entities: [],
        components: [],
        resources: [],
        rawComponents: null,
        selectedEntity: null,
        activeTab: 0,

        update: function(data) {
            this.entities = data.entities;

            // Sort components before updating the local data to ensure that components always appear
            // in the same order regardless of the order they are sent in.
            var sortedComponents = data.components;
            sortedComponents.sort(compareNamed);
            this.components = sortedComponents;

            // Sort resources before updating the local data to ensure that resources always appear
            // in the same order regardless of the order they are sent in.
            var sortedResources = data.resources;
            sortedResources.sort(compareNamed);
            this.resources = sortedResources;
        },
    };
});

ipcRenderer.on('disconnect', (event, data) => {
    delete app.games[data.id];
});

ipcRenderer.on('update', (event, data) => {
    console.log(data);

    let game = app.games[data.id];
    game.update(data.data);
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
