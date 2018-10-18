Vue.component('data-display', {
    props: ['data'],
    template: `
        <div>
            <ul>
                <li v-for="(value, key) in data">
                    {{ key }}:

                    <template v-if="typeof value === 'object'">
                        <data-display :data="value"></data-display>
                    </template>
                    <template v-else>
                        {{ value }}
                    </template>
                </li>
            </ul>
        </div>
    `,
});
