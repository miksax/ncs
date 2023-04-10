<template>
    <div class="block">
        <div style="float: right;">
            <div class="upper">
                <button class="btn" @click="renew(contract, leaf)">Renew</button>
                <button class="btn" @click="payout(contract, leaf)">Payout</button>
            </div>
        </div>

        <h2>NFT</h2>
        <table>
            <tr>
                <th>Name</th>
                <td>{{ name }} ( {{ leaf.datum.name }} )</td>
            </tr>
            <tr>
                <th>Transaction</th>
                <td>{{ leaf.utxo.txHash }}</td>
            </tr>
            <tr>
                <th>Start</th>
                <td>{{ start }}</td>
            </tr>
            <tr>
                <th>Expiration</th>
                <td>{{ expiration }}</td>
            </tr>
            <tr>
                <th>Reward time</th>
                <td>{{ leaf.datum.time }}</td>
            </tr>
            <tr>
                <th>Reward amount</th>
                <td>{{ leaf.datum.amount }}</td>
            </tr>
        </table>
    </div>
</template>

<script lang="ts">
import {
  toText
} from "lucid-cardano";
import { contractAssetRenew, contractAssetPayout, type Contract, type Leaf } from '../staking'
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'

export default {
    data: () => ({}),
    props: {
        contract: {
            type: Object,
            required: true
        },
        leaf: {
            type: Object,
            required: true
        },
    },
    computed: {
        ...mapStores(stakingStore),
        name() {
            return toText(this.leaf.datum.name)
        },
        start() {
            return new Date(Number(this.leaf.datum.start)).toLocaleString();
        },
        expiration() {
            return new Date(Number(this.leaf.datum.expiration)).toLocaleString();
        }
    },
    methods: {
        async renew(contract: Contract, leaf: Leaf) {
            const lucid = await this.stakingStore.getWallet("staker");
            const signedTx = await contractAssetRenew(contract, leaf, lucid,  this.stakingStore.debug, false);

            const txHash = await signedTx.submit();
            console.log(`Submitted transaction: ${txHash}`);
            await lucid.awaitTx(txHash);
            console.log(`Confirmed`);
        },
        async payout(contract: Contract, leaf: Leaf) {
            const lucid = await this.stakingStore.getWallet("staker");
            const signedTx = await contractAssetPayout(contract, leaf, lucid,  this.stakingStore.debug, true);

            const txHash = await signedTx.submit();
            console.log(`Submitted transaction: ${txHash}`);
            await lucid.awaitTx(txHash);
            console.log(`Confirmed`);
        }
    }
}
</script>