<template>
    <div class="main">
        <div class="block">
            <div style="float: right;">
                <div class="upper">
                    <button @click="stakingStore.load()" class="btn">Reload all</button>
                </div>
            </div>

            <h2>Global settings</h2>
            <div class="form-group">
                <label for="debug">Debug</label>
                <input type="checkbox" v-model="stakingStore.debug" @change="stakingStore.saveLocalStorage()">
            </div>
            <div class="form-group">
                <label for="debug">Site</label>
                <input v-model="stakingStore.blockfrostNetwork" @change="stakingStore.saveLocalStorage()">
            </div>
            <br />
        </div>
    </div>
</template>

<script lang="ts">
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking';

export default {
  data: () => ({
    collapsed: true
  }),
  computed: {
    ...mapStores(stakingStore),
  },
  methods: {
    toggle() {
      this.collapsed = !this.collapsed;
    }
  }
}
</script>