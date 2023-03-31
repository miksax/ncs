<script lang="ts" setup>
import { stakingStore } from '../stores/staking'
import AssetComponent from "../components/AssetComponent.vue";

const staking = stakingStore()

</script>

<template>
  <div class="about">
    <button @click="staking.load()">Kokot</button>
    <AssetComponent v-bind="{unit: 'a41ad23e676b48da068869ce2ed840fbf5e7d8d6d8c46956bc53e4cc4d696b7361', amount: 1234}"></AssetComponent>
    <ul>
    </ul>
  </div>
</template>

