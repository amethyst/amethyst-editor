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
        applyEdits: function() {
            this.$emit('submit', this.editedValue);
            this.clearEdits();
        },

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
        <form v-on:submit.prevent="" class="data-display" v-bind:class="{ 'is-root': isRoot }">
            <ul>
                <li v-for="(value, key) in data">

                    <template v-if="value instanceof Object || value instanceof Array">
                        <label class="label">{{ key }}</label>
                        <data-display
                            :data="value"
                            v-model="edits[key]"
                            v-on:input="$emit('input', editedValue)"
                            v-on:submit.prevent="applyEdits()"
                            ref="nestedData"
                            :isRoot="false"
                        ></data-display>
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
                                v-on:submit.prevent="applyEdits()"
                                type="number"
                                class="input"
                            >
                            <input
                                v-else
                                v-model="edits[key]"
                                v-bind:placeholder="value"
                                v-on:input="$emit('input', editedValue)"
                                v-on:submit.prevent="applyEdits()"
                                class="input"
                            >
                        </div>
                    </template>
                </li>
            </ul>

            <button
                v-if="isRoot && hasEdits"
                v-on:click="applyEdits()"
                class="button is-fullwidth is-primary"
            >
                Apply
            </button>
        </form>
    `,
});
