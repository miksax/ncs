<template>
    <div v-if="contract" class="block">
        <div style="float: right;">
            <div class="upper">
                <button @click="close(contract)" class="btn">Close</button>
            </div>
        </div>

        <h2>Detail</h2>
        <table>
            <tr>
                <th>Last transaction</th>
                <td>
                    <CardanoScan type="transaction" :value="contract.utxo.txHash"></CardanoScan>
                </td>
            </tr>
            <tr>
                <th>Hash</th>
                <td>{{ contract.hash }}</td>
            </tr>
            <tr>
                <th>Expiration</th>
                <td>{{ formatDate(expiration) }}</td>
            </tr>
            <tr>
                <th>Owner</th>
                <td>
                    <CardanoScan type="address" :value="'60' + contract.datum.owner"></CardanoScan>
                </td>
            </tr>
            <tr>
                <th>PolicyId</th>
                <td>
                    <CardanoScan type="tokenPolicy" :value="contract.datum.policyId"></CardanoScan>
                </td>
            </tr>
            <tr>
                <th>Reward</th>
                <td>
                    <CardanoScan type="token" :value="contract.datum.reward.policyId + contract.datum.reward.name"
                        :name="toText(contract.datum.reward.name)"></CardanoScan>
                </td>
            </tr>
            <tr>
                <th>Reward time</th>
                <td>{{ contract.datum.reward.time }}</td>
            </tr>
            <tr>
                <th>Reward amount</th>
                <td>{{ contract.datum.reward.amount }}</td>
            </tr>
            <tr>
                <th>Reward timeout</th>
                <td>{{ contract.datum.reward.timeout }}</td>
            </tr>
            <tr>
                <th>Lovelace</th>
                <td>{{ contract.datum.lovelace }}</td>
            </tr>
            <tr>
                <th>Count</th>
                <td>{{ contract.datum.count }}</td>
            </tr>
            <tr>
                <th>First</th>
                <td>{{ first }}</td>
            </tr>
        </table>
    </div>
</template>

<script lang="ts">
import { contractClose, type Contract } from '../staking'
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'
import CardanoScan from '../components/CardanoScan.vue'
import {
    toText,
} from "lucid-cardano";

export default {
    props: ["contract"],
    components: { CardanoScan },
    computed: {
        ...mapStores(stakingStore),
        expiration() {
            return new Date(Number(this.contract?.datum.expiration));
        },
        first() {
            if (this.contract.datum.first) {
                return toText(this.contract.datum.first)
            } else {
                return "N/A"
            }
        }
    },
    methods: {
        toText(asset: string) {
            return toText(asset);
        },
        formatDate(date: Date) {
            return date.toLocaleString()
        },
        async close(contract: Contract) {
            console.log("closing");
            const lucid = await this.stakingStore.getWallet('owner');
            const signedTx = await contractClose(lucid, contract, this.stakingStore.debug, true);
            const txHash = await signedTx.submit();
            console.log(`Submitted transaction: ${txHash}`);
            await lucid.awaitTx(txHash);
            console.log(`Confirmed`);
        }
    }
}
</script>