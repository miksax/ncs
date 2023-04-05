<template>
    <div class="flex-container">
        <div class="side">
            <h2>Blockfrost</h2>
            <p>
                At the first, we need to setup connection to the cardano blockchain.
            </p>
            <h2>Funds</h2>
            <p>
                You need some fund to work with tool. Some amount of Ada is enought.
            </p>
        </div>
        <div class="main">
            <h1>Initialize of the staking</h1>
            <div class="block">
                <table>
                    <tr>
                        <th>Blockfost api</th>
                        <td><input v-model="blockfrostApi"></td>
                    </tr>
                    <tr>
                        <th>Blockfost Token</th>
                        <td><input v-model="blockfrostToken"></td>
                    </tr>

                    <tr>
                        <th>Blockfost Network</th>
                        <td><input v-model="blockfrostNetwork"></td>
                    </tr>

                    <tr>
                        <th>Owner Key</th>
                        <td><input v-model="owner"></td>
                        <td><button class="btn" @click="generateOwner()">Generate key</button></td>
                    </tr>

                    <tr>
                        <th>Staker Key</th>
                        <td><input v-model="staker"></td>
                        <td><button class="btn" @click="generateStaker()">Generate key</button></td>
                    </tr>
                </table>
                <button class="btn" @click="save()">Save</button>
                <button class="btn" @click="test()">Test</button>
            </div>
        </div>
    </div>
</template>

<script lang="ts">
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'


export default {
    data: () => {
        const staking = stakingStore()
        return {
            blockfrostApi: staking.blockfrostApi,
            blockfrostToken: staking.blockfrostToken,
            blockfrostNetwork: staking.blockfrostNetwork,
            owner: staking.keys["owner"] || "",
            staker: staking.keys["staker"] || "",
        }
    },
    computed: {
        ...mapStores(stakingStore)
    },
    methods: {
        async generateOwner() {
            this.owner = await this.stakingStore.genKey();
        },
        async generateStaker() {
            this.staker = await this.stakingStore.genKey();
        },
        async save() {
            this.stakingStore.blockfrostApi = this.blockfrostApi;
            this.stakingStore.blockfrostToken = this.blockfrostToken;
            this.stakingStore.blockfrostNetwork = this.blockfrostNetwork;
            this.stakingStore.keys["owner"] = this.owner;
            this.stakingStore.keys["staker"] = this.staker;

            await this.stakingStore.load()

            if(this.stakingStore.isBlockfrostSetup) {
                this.$router.push("contracts")
            }
        },
        test() {
            this.$router.push("contracts")
        }
    }
}
</script>