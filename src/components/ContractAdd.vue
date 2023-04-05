<template>
    <div class="block">
        <div style="float: right;">
            <div class="upper">
                <button class="btn" @click="add(name)">Add</button>
            </div>
        </div>

        <h2>NFT add</h2>
        <select v-model="name">
            <option v-for="asset in assets" :key="asset.unit" :value="asset.name">{{ asset.name }}</option>
        </select>
    </div>
</template>

<script lang="ts">
import {
  fromUnit, toText, fromText, type Unit
} from "lucid-cardano";
import { contractAssetAdd, type Contract } from "../staking"
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'

type Asset = {
    unit: Unit;
    policyId: string;
    name: string;
}

export default {
    props: {
        contract: {
            type: Object,
            required: true
        }
    },
    data: () => ({name: ""}),
    computed: {
        ...mapStores(stakingStore),
        assets() {
            const contract = this.contract as Contract;
            let assets: Asset[] = [];
            for(const unit in this.stakingStore.assets["staker"]) {
                const parse = fromUnit(unit)
                if(
                    parse.policyId == contract.datum.policyId
                    && contract.database.find((l)=> (l.datum.name == parse.assetName)) === undefined
                ) {
                    assets.push({
                        unit,
                        policyId: parse.policyId,
                        name: parse.assetName?toText(parse.assetName):""
                    })
                }
            }
            return assets;
        }
    },
    methods: {
        async add(name: string) {
            const contract = this.contract as Contract;
            const lucid = await this.stakingStore.getWallet("staker");
            const signedTx = await contractAssetAdd(contract, lucid, fromText(name), this.stakingStore.debug);

            const txHash = await signedTx.submit();
            console.log(`Submitted transaction: ${txHash}`);
            await lucid.awaitTx(txHash);
            console.log(`Confirmed`);

        }
    }
}
</script>