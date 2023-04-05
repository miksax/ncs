<template>
    <div class="flex-container wallet">
        <div class="side">
            <h2>Wallets</h2>
            <div
                v-for="wallet in list" :key="wallet.name"
                :class="{selected: wallet.name == selected, item: true}"
                @click="router({name: 'wallet', params: {selected: wallet.name}})"
            >
                <div>
                    <router-link :to="{name: 'wallet', params: {selected: wallet.name}}">{{ wallet.name }}</router-link>
                </div>
                <small>{{ wallet.address }}</small>
            </div>
            <br />
            <div class="flex-container">
                <input v-model="newWallet">
                <button @click="create(newWallet)" class="btn">Create</button>
            </div>
            <br />
            <button @click="reload()" class="btn">Reload</button>
        </div>

        <div v-if="selected" class="main">
            <h1>Wallet {{ selected }} <small><CardanoScan type="address" :value="stakingStore.addresses[selected]"></CardanoScan></small></h1>
            <div class="block">
                <div style="float: right;">
                    <div class="upper">
                        <button @click="all()" class="btn">All</button>
                        <button @click="sendAssets = {}" class="btn">Reset</button>
                        <button @click="stakingStore.loadWallet(selected)" class="btn rounded">Reload</button>
                    </div>
                </div>
                <h2>Assets</h2>
                <div v-if="assets.length > 0">
                    <table class="stripped">
                        <thead>
                            <tr>
                                <th>PolicyId</th>
                                <th>Name</th>
                                <th>Amount</th>
                                <th>Send amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="asset in assets" :key="asset.unit">
                                <td><CardanoScan type="tokenPolicy" :value="asset.policyId"></CardanoScan></td>
                                <td>{{ asset.name }}</td>
                                <td @click="sendAssets[asset.unit] = asset.amount" style="cursor: pointer;">{{ asset.amount }}</td>
                                <td><input v-model.number="sendAssets[asset.unit]" type="number"></td>
                            </tr>
                        </tbody>
                    </table>
                    <br />
                    <div class="flex-container">
                        <AddressSelect v-model="toAddress"></AddressSelect>
                        <button @click="send()" class="btn">Send</button>
                    </div>
                </div>
                <p v-if="assets.length == 0">
                    No asset presents
                </p>
                <br />
            </div>

            <div class="block">
                <h2>Mint<small>{{ policyId }}</small></h2>
                <table>
                    <tr>
                        <th>Name</th>
                        <td><input v-model="mintName"></td>
                    </tr>
                    <tr>
                        <th>Amount</th>
                        <td><input v-model.number="mintAmount" type="number"></td>
                    </tr>
                </table>
                <br />
                <div class="flex-container">
                    <AddressSelect v-model="toAddress"></AddressSelect>
                    <button @click="mint(mintName, toAddress, mintAmount)" class="btn">Mint</button>
                </div>
            </div>
        </div>
        <div v-if="!selected" class="main">
            <h1>Wallets</h1>
            <div class="block">
                <h2>NFT and reward</h2>
                <ul>
                    <li>Contract owner needs some reward assets.</li>
                    <li>Staker need some NFT to stake it.</li>
                </ul>
                <p>
                    You can mint both in the wallet or use existing ones.
                </p>
            </div>
        </div>
    </div>
</template>

<style>
.wallet .item {
    padding: 5px;
    cursor: pointer;
    border: 1px solid var(--color-background);
}
.wallet .item:hover {
    border: 1px solid var(--color-border)
}

.wallet table , .wallet input {
    width: 100%;
}
.wallet .side small {
    font-size:0.6em;
}
</style>

<script lang="ts">
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'
import AddressSelect from '../components/AddressSelect.vue'
import CardanoScan from '../components/CardanoScan.vue'

import {
    fromUnit,
    toText,
} from "lucid-cardano";

export default {
    data: () => {
        const staking = stakingStore()
        return {
            //selected: null,
            newWallet: "",
            toSelect: "",
            toAddress: "",
            sendAssets: {} as Record<string, bigint>,
            mintName: "Test",
            mintAmount: 0,
        }
    },
    props: ["selected"],
    components: { AddressSelect, CardanoScan},
    computed: {
        ...mapStores(stakingStore),
        list() {
            const result = Object.keys(this.stakingStore.keys).map(key => ({
                name: key,
                address: this.stakingStore.addresses[key]
            }));
            return result
        },
        policyId(): string {
            if(this.selected) {
                return this.stakingStore.policyIds[this.selected];
            }
            return "";
        },
        assets() {
            if(this.selected in this.stakingStore.assets) {
                const assets = this.stakingStore.assets[this.selected];
                return Object.keys(assets).map(unit => {
                    const parsed = fromUnit(unit);
                    return {
                        unit,
                        policyId: parsed.policyId,
                        assetName: parsed.assetName,
                        name: parsed.policyId == "lovelace"?parsed.policyId:toText(parsed.name!),
                        amount: assets[unit]
                    }
                })
            }

            return []
        }
    },
    methods: {
        async create(name: string) {
            await this.stakingStore.setKey(name, undefined);
            this.stakingStore.saveLocalStorage();
            //this.route.push({"wallet = name;
        },
        all() {
            for(const asset of this.assets) {
                if(asset.unit !== "lovelace") {
                    this.sendAssets[asset.unit] = asset.amount;
                }
            }
        },
        async reload() {
            await this.stakingStore.loadWallets();
        },
        async send() {
            console.log(this.selected, this.toAddress, this.sendAssets);
            const txHash = await this.stakingStore.send(this.selected, this.toAddress, this.sendAssets);
            console.log(txHash);
        },
        async mint(name: string, address: string, amount: number) {
            const txHash = await this.stakingStore.mint(this.selected, address, name, BigInt(amount));
            console.log(txHash);
        }
        ,
        router(data: any) {
            this.$router.push(data)
        }
    }
}
</script>