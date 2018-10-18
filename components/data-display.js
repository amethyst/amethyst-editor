Vue.component('data-display', {
    props: {
        data: [Object, Array],
        isRoot: {
            type: Boolean,
            default: true,
        },
    },

    template: `
        <div>
            <ul>
                <li v-for="(value, key) in data">
                    {{ key }}:

                    <template v-if="value instanceof Object || value instanceof Array">
                        <data-display :data="value" :isRoot="false"></data-display>
                    </template>
                    <template v-else>
                        {{ value }}
                    </template>
                </li>
            </ul>

            <button v-if="isRoot" v-on:click="$emit('save-edits', data)">Save</button>
        </div>
    `,
});
