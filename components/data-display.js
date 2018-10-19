Vue.component('data-display', {
    props: {
        data: [Object, Array],
    },

    data: function() {
        return {
            editedValue: null,
        };
    },

    computed: {
        hasEdits: function() { return this.editedValue != null; }
    },

    methods: {
        submitEdits: function() {
            this.$emit('submit', this.editedValue);
            this.clearEdits();
        },

        clearEdits: function() {
            this.editedValue = null;
            if (this.$refs.nestedData != null) {
                this.$refs.nestedData.clearEdits();
            }
        }
    },

    template: `
        <form v-on:submit.prevent="submitEdits()" class="data-display">
            <nested-data
                :data="data"
                v-model="editedValue"
                ref="nestedData"
            ></nested-data>

            <input
                v-if="hasEdits"
                type="submit"
                class="button is-fullwidth is-primary"
            >
        </form>
    `,
});

Vue.component('nested-data', {
    props: ['data'],

    data: function() {
        return {
            edits: {},
        };
    },

    computed: {
        hasEdits: function() {
            for (let prop in this.edits) {
                if (this.edits.hasOwnProperty(prop)) {
                    return true;
                }
            }

            return false;
        },

        editedValue: function() {
            // Create a copy of the data, overriding any edited fields with the
            // corresponding values.
            let copy = Object.assign({}, this.data);
            return Object.assign(copy, this.edits);
        }
    },

    methods: {
        clearEdits: function() {
            this.edits = {};
            if (this.$refs.nestedData != null) {
                for (let child of this.$refs.nestedData) {
                    child.clearEdits();
                }
            }
        }
    },

    template: `
        <ul>
            <li v-for="(value, key) in data">
                <template v-if="value instanceof Object || value instanceof Array">
                    <label class="label">{{ key }}</label>
                    <nested-data
                        :data="value"
                        v-model="edits[key]"
                        v-on:input="$emit('input', editedValue)"
                        ref="nestedData"
                        :isRoot="false"
                    ></nested-data>
                </template>
                <template v-else>
                    <div class="field is-horizontal">
                        <div class="field-label">
                            <label class="label">{{ key }}</label>
                        </div>
                        <input
                            v-if="typeof value === 'number'"
                            v-model.number="edits[key]"
                            v-bind:placeholder="value"
                            v-on:input="$emit('input', editedValue)"
                            type="number"
                            class="input"
                        >
                        <input
                            v-else
                            v-model="edits[key]"
                            v-bind:placeholder="value"
                            v-on:input="$emit('input', editedValue)"
                            class="input"
                        >
                    </div>
                </template>
            </li>
        </ul>
    `,
});
