<script lang="ts">
import { mapStores } from 'pinia'
import { RouterLink, RouterView } from 'vue-router';
import BlockfrostView from "./views/BlockfrostView.vue";
import { stakingStore } from './stores/staking';

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

<template>
  <header v-if="stakingStore.isBlockfrostSetup">
    <nav>
        <RouterLink to="/">Blockfrost</RouterLink>
        <RouterLink to="/setting">Setting</RouterLink>
        <RouterLink to="/wallets">Wallets</RouterLink>
        <RouterLink to="/create">Create</RouterLink>
        <RouterLink v-if="stakingStore.contractList.length > 0" to="/contracts">Contracts</RouterLink>
      </nav>
  </header>

  <RouterView v-if="stakingStore.isBlockfrostSetup" />
  <BlockfrostView v-if="!stakingStore.isBlockfrostSetup" />

  <footer>
    <h2>About</h2>
    <p>
      Created with love by <a href="https://vacuumlabs.com/">Vacuumlabs</a>
    </p>
  </footer>
</template>

<style scoped>
header {
  /*line-height: 1.5;
  max-height: 100vh;*/
  display: block;
}

footer {
  /*border-top: 2px solid var(--color-accent);*/
  margin-top: 100px;
  text-align: center;
}

footer .global {
/*  background-color: var(--color-background-soft);*/
  padding: 20px;
}

nav {
  width: 100%;
  font-size: 12px;
  text-align: center;
}

nav a.router-link-exact-active {
  color: var(--color-text);
}

nav a.router-link-exact-active:hover {
  background-color: transparent;
}

nav a {
  display: inline-block;
  padding: 0 1rem;
  border-left: 1px solid var(--color-border);
}

nav a:first-of-type {
  border: 0;
}
</style>
