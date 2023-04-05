<template>
    <a :href="link" target="_blank">{{ name || value}}</a>
</template>
<script lang="ts">
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'

export default {
  props: {
    name: String,
    type: String,
    value: String

  },
  computed: {
    ...mapStores(stakingStore),
    link() {
        let api_base = ""
        switch(this.stakingStore.blockfrostNetwork) {
            case "Preview": {
                api_base = "https://preview.cardanoscan.io";
                break;
            }
            case "Preprod": {
                api_base = "https://preprod.cardanoscan.io";
                break;
            }
            case "Mainnet": {
                api_base = "https://cardanoscan.io";
            }
        }
        return `${api_base}/${this.type}/${this.value}`;
    }
  },
  methods: {
  }
}
</script>
