<script setup>
import { contextStore } from '@/stores/context'

const context = contextStore()
</script>

<template>
  <div class="about">
    <h1>This is an about page 2222 {{ context.count }} aaa</h1>
    <button @click="context.increment()">Increment</button>
    <button @click="context.test()">Kokot</button>
  </div>
</template>

