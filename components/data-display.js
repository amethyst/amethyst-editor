Vue.component('data-display', {
    props: {
        data: [Object, Array],
        isRoot: {
            type: Boolean,
            default: true,
        },
    },

    data: function() {
        return {
            editedValues: {},
        };
    },

    computed: {
        hasEdits: function() {
            for (let prop in this.editedValues) {
                if (this.editedValues.hasOwnProperty(prop)) {
                    return true;
                }
            }

            return false;
        },
    },

    methods: {
        generateEdited: function() {
            let copy = Object.assign({}, this.data);
            let edited = Object.assign(copy, this.editedValues);
            this.editedValues = {};
            return edited;
        },
    },

    template: `
        <div class="data-display" v-bind:class="{ 'is-root': isRoot }">
            <ul>
                <li v-for="(value, key) in data">

                    <template v-if="value instanceof Object || value instanceof Array">
                        <label class="label">{{ key }}</label>
                        <data-display :data="value" :isRoot="false"></data-display>
                    </template>
                    <template v-else>
                        <div class="field is-horizontal">
                            <div class="field-label">
                                <label class="label">{{ key }}</label>
                            </div>
                            <input
                                v-if="typeof value === 'number'"
                                v-model.number="editedValues[key]"
                                v-bind:placeholder="value"
                                type="number"
                                class="input"
                            >
                            <input
                                v-else
                                v-model="editedValues[key]"
                                v-bind:placeholder="value"
                                class="input"
                            >
                        </div>
                    </template>
                </li>
            </ul>

            <button
                v-if="isRoot"
                v-on:click="$emit('save-edits', generateEdited())"
                class="button is-fullwidth is-primary"
                v-bind:disabled="!hasEdits"
            >
                Apply
            </button>
        </div>
    `,
});
