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
                                v-model="editedValues[key]"
                                v-bind:placeholder="value"
                                class="input"
                            >
                        </div>
                    </template>
                </li>
            </ul>

            <button v-if="isRoot" v-on:click="$emit('save-edits', data)">Save</button>
        </div>
    `,
});
