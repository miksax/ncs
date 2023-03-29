<script setup>
import { walletStore } from '@/stores/wallet'

const wallet = walletStore()
</script>

<template>
  <main>
    {{ wallet.owner.sig }}
  </main>
</template>
