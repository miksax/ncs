<script lang="ts">
import {fromUnit, toText} from "lucid-cardano";

  export default {
    props: {
      unit: {
        type: String,
        required: true
      },
      amount: {
        type: Number,
        required: true
      }
    },
    computed: {
      name() {
        return toText(fromUnit(this.unit).assetName!)
      }
    }
  }
</script>

<template>
    <span>
        <span>{{ name }}</span> {{ amount }}
    </span>
</template>

<style scoped>
    span {
        background-color: rgb(0, 0, 0);
        padding: 3px 10px;
        border-radius: 10px;
        color: rgb(252, 254, 255);
        border-collapse: collapse;
        box-sizing: border-box;
        display: inline-block;
    }
    span span {
        color: rgb(111, 100, 197);
        background-color: rgb(23, 24, 28);
        margin: 2px;
    }
</style>