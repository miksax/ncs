<script lang="ts">
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'

export default {
  props: {
    modelValue: String,
    modelModifiers: {
      default: () => ({})
    }
  },
  computed: {
    ...mapStores(stakingStore),
  },
  emits: ['update:modelValue'],
  methods: {
    emitValue(event: Event) {
      let value = (event.target as HTMLInputElement).value;
      this.$emit('update:modelValue', value);
    }
  }
}
</script>

<template>
  <select :value="modelValue" @input="emitValue">
        <option value="">Select or type</option>
        <option v-for="(address, name) in stakingStore.addresses" :key="address" :value="address">{{ name }}</option>
        <option :value="modelValue">Other</option>
    </select>
    <input :value="modelValue" @change="emitValue">
</template>