<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router';
import BlockfrostView from "./views/BlockfrostView.vue";
import { stakingStore } from './stores/staking';

const staking = stakingStore();
</script>

<template>
  <header v-if="staking.blockfrost">
    <nav>
        <RouterLink to="/">Blockfrost</RouterLink>
        <RouterLink to="/wallets">Wallets</RouterLink>
        <RouterLink to="/contracts">Contract</RouterLink>
        <RouterLink v-if="staking.contract" to="/owner">Owner</RouterLink>
        <RouterLink v-if="staking.contract" to="/beneficient">Beneficient</RouterLink>
      </nav>
  </header>

  <RouterView v-if="staking.blockfrost" />
  <BlockfrostView v-if="!staking.blockfrost" />
</template>

<style scoped>
header {
  /*line-height: 1.5;
  max-height: 100vh;*/
  display: block;
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
