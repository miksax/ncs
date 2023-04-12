<template>
    <div v-if="contract" class="block">
        <div style="float: right;">
            <div class="upper">
                <button class="btn" @click="renew(contract, renewData)">Renew</button>
            </div>
        </div>

        <h2>Renew</h2>
        <table>
            <tr>
                <th>Reward Amount</th>
                <td><input type="number" v-model="renewData.rewardAmount"></td>
            </tr>
            <tr>
                <th>Reward time</th>
                <td><input type="number" step="900000" v-model="renewData.rewardTime"></td>
            </tr>
            <tr>
                <th>Reward timeout</th>
                <td><input type="number" step="900000" v-model="renewData.rewardTimeout"></td>
            </tr>
            <tr>
                <th>Lovelace</th>
                <td><input type="number" step="1000000" v-model="renewData.lovelace"></td>
            </tr>
            <tr>
                <th>Expiration</th>
                <td><input type="number" step="900000" v-model="renewData.expiration"></td>
                <td>{{ formatDate(expiration) }}</td>
            </tr>
        </table>

    </div>
</template>


<script lang="ts">
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'
import CardanoScan from '../components/CardanoScan.vue'
import { contractRenew, type Contract } from '../staking'
import {
    toText,
} from "lucid-cardano";

type RenewData = {
    rewardAmount: Number
    rewardTime: Number
    rewardTimeout: Number
    expiration: Number
    lovelace: Number
};

export default {
    props: {
        data: {
            type: Object,
            required: true
        },
    },
    data() {
        const contract = this.data as Contract;
        return {
            contract,
            renewData: {
                rewardAmount: Number(contract.datum.reward.amount),
                rewardTime: Number(contract.datum.reward.time),
                rewardTimeout: Number(contract.datum.reward.timeout),
                expiration: Number(contract.datum.expiration) + 3600000,
                lovelace: Number(contract.datum.lovelace),
            } as RenewData
        }
    },
    computed: {
        ...mapStores(stakingStore),
        expiration() {
            return new Date(Number(this.renewData.expiration));
        }
    },
    methods: {
        formatDate(date: Date) {
            return date.toLocaleString()
        },
        async renew(contract: Contract, renewData: RenewData) {
            const lucid = await this.stakingStore.getWallet("owner");
            const signedTx = await contractRenew(
                contract,
                lucid,
                BigInt(Number(renewData.expiration)),
                BigInt(Number(renewData.lovelace)),
                BigInt(Number(renewData.rewardTimeout)),
                BigInt(Number(renewData.rewardTime)),
                BigInt(Number(renewData.rewardAmount)),
                BigInt(5),
                this.stakingStore.debug,
                false
            );

            const txHash = await signedTx.submit();
            console.log(`Submitted transaction: ${txHash}`);
            await lucid.awaitTx(txHash);
            console.log(`Confirmed`);
        }
    }
}
</script>