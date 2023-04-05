<template>
    <div class="block">
        <div style="float: right;">
            <div class="upper">
                <button class="btn">Renew</button>
                <button class="btn">Payout</button>
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
  fromText,
  toText
} from "lucid-cardano";
export default {
    data: () => ({}),
    props: ["contract", "leaf"],
    computed: {
        name() {
            return toText(this.leaf.datum.name)
        },
        start() {
            return new Date(Number(this.leaf.datum.start)).toLocaleString();
        },
        expiration() {
            return new Date(Number(this.leaf.datum.expiration)).toLocaleString();
        }
    }
}
</script>