<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <header>
    <nav>
        <RouterLink to="/">Owner</RouterLink>
        <RouterLink to="/about">Beneficient</RouterLink>
      </nav>
  </header>

  <RouterView />
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
