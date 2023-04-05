<template>
    <div class="flex-container list">
        <div class="side">
            <h2 v-if="contractList.length > 0">List</h2>
            <div v-for="contract in contractList" :key="contract.hash" class="item">
                <router-link :to="{name: 'contractListSelected', params: {txHash: contract.utxo.txHash}}">{{ contract.utxo.txHash }}</router-link>
            </div>
            <br />
            <button @click="reload()" class="btn">Reload</button>
        </div>
        <div class="main" v-if="contractList.length > 0">

            <h1>Contract list</h1>
            <div class="block">
                <h2>Filter</h2>
            </div>

            <ContractDetail v-if="contract" :contract="contract"></ContractDetail>
            <ContractRenew v-if="contract" :data="contract"></ContractRenew>
            <ContractLeaf v-for="leaf in contract?.database" :key="leaf.utxo.txHash" :contract="contract" :leaf="leaf"></ContractLeaf>
            <ContractAdd v-if="contract" :contract="contract"></ContractAdd>
        </div>
    </div>
</template>

<style>
.list .item {
    padding: 5px;
    cursor: pointer;
    border: 1px solid var(--color-background);
}

.list .item:hover {
    border: 1px solid var(--color-border)
}
</style>

<script lang="ts">
import { contractClose, type Contract } from '../staking'
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'
import {
    toText,
} from "lucid-cardano";
import CardanoScan from '../components/CardanoScan.vue'
import ContractDetail from '../components/ContractDetail.vue'
import ContractRenew from '../components/ContractRenew.vue'
import ContractAdd from '../components/ContractAdd.vue'
import ContractLeaf from '../components/ContractLeaf.vue'

type Data = {
    filter: {},
};

export default {
    props: {
        txHash: String || null,
    },
    components: { ContractDetail, ContractRenew, ContractAdd, ContractLeaf },
    data: () => {
        return {
            filter: {},
        } as Data

    },
    computed: {
        ...mapStores(stakingStore),
        contractList() {
            let contractList = this.stakingStore.contractList;
            return contractList;
        },
        contract() {
            return this.contractList.find(c => c.utxo.txHash == this.txHash);
        },
        canClose() {
            // Check if the owner of the contract has same wallet like owner...
            return true
        },
        expiration() {
            return new Date(Number(this.contract?.datum.expiration));
        }
    },
    methods: {
        toText(asset: string) {
            return toText(asset);
        },
        formatDate(date: Date) {
            return date.toLocaleString()
        },
        async reload() {
            await this.stakingStore.loadUTxOs();
        }
    }
}
</script>