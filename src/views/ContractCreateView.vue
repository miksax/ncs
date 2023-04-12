<template>
    <div class="flex-container create">
        <div class="side">
            <h2 v-if="contractList.length > 0">Existing</h2>
            <div class="item" v-for="contract in contractList" :key="contract.hash" @click="fill(contract)">
                {{ contract.hash }}
            </div>
            <br />
            <button @click="reload()" class="btn">Reload</button>
        </div>
        <div class="main">
            <h1>NFT staking creation</h1>
            <div class="block">
                <h2>Common</h2>
                <table>
                    <tr>
                        <th>PolicyId</th>
                        <td>
                            <select v-model="createData.policyId">
                                <option value="">Select or type</option>
                                <option v-for="asset in assets" :key="asset.unit" :value="asset.policyId">{{ asset.name }}</option>
                                <option :value="createData.policyId">Other</option>
                            </select>
                            <input v-model="createData.policyId">
                        </td>
                        <td><small>PolicyId of staked NFT</small></td>
                    </tr>
                    <tr>
                        <th>Timeout</th>
                        <td><input type="number" v-model.number="createData.timeout"></td>
                        <td>Timeout of the staking NFT</td>
                    </tr>
                    <tr>
                        <th>Lovelace</th>
                        <td><input type="number" v-model.number="createData.lovelace"></td>
                        <td>Minimal Lovelace on UTxOs</td>
                    </tr>
                    <tr>
                        <th>Max</th>
                        <td><input type="number" v-model.number="createData.max"></td>
                        <td>Maximum staked NFTs</td>
                    </tr>
                </table>
            </div>
            <div class="block">
                <h2>Reward</h2>
                <table>
                    <tr>
                        <td></td>
                        <td>
                            <select v-model="asset" @change="select()">
                                <option value="">Select or type</option>
                                <option v-for="asset in assets" :key="asset.unit" :value="asset">{{ asset.name }}</option>
                                <option :value="assets">Other</option>
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>PolicyId</th>
                        <td><input v-model="createData.reward.policyId"></td>
                        <td>PolicyId of the reward asset</td>
                    </tr>
                    <tr>
                        <th>Name</th>
                        <td><input v-model="createData.reward.name"></td>
                        <td>Name of the reward asset</td>
                    </tr>
                    <tr>
                        <th>Amount</th>
                        <td><input v-model="createData.reward.amount"></td>
                        <td>Amount of reward asset per time</td>
                    </tr>
                    <tr>
                        <th>Time</th>
                        <td><input v-model="createData.reward.time"></td>
                        <td>duration(s) * amount(u) / time(s)</td>
                    </tr>
                    <tr>
                        <th>Timeout</th>
                        <td><input v-model="createData.reward.timeout"></td>
                        <td>Timeout of the NFT registration</td>
                    </tr>
                </table>
            </div>
            <p v-if="contractList.length > 0">
                This kind of staking already exists !!!
            </p>

            <button v-if="isValid" class="btn acc" style="padding: 20px; margin-left: 10px; width: 100%; border-radius: 5px var(--rounded) 5px" @click="create()">Create</button>
            <p v-if="!isValid">
                <strong>Form is not valid!</strong>
                <br />
                Please, corrent all parametres.
            </p>

        </div>
    </div>
</template>

<style>
table {
    width: 100%;
}
table input, table select {
    width: 100%;
}
.create .item {
    padding: 5px;
    cursor: pointer;
    border: 1px solid var(--color-background);
}
.create .item:hover {
    border: 1px solid var(--color-border)
}

</style>

<script lang="ts">
import { mapStores } from 'pinia'
import { stakingStore } from '../stores/staking'
import { Reward, contractCreate, type Contract } from '../staking'
import {
  fromUnit, toText, fromText, type Unit
} from "lucid-cardano";

type Asset = {
    unit: Unit;
    policyId: string;
    name: string;
}


type Data = {
    createData: {
        policyId: string
        timeout: number
        lovelace: number
        max: number
        reward: {
            name: string,
            policyId: string,
            amount: number,
            time: number,
            timeout: number,
        },
    },
    asset: Asset | null
}

export default {
    data: () => ({
        createData: {
            policyId: "",
            timeout: 3600000,
            lovelace: 3000000,
            max: 5,
            reward: {
                name: "",
                policyId:"",
                amount: 1,
                time: 60000,
                timeout: 1800000,
            }
        },
        asset: null,
    } as Data),
    computed: {
        ...mapStores(stakingStore),
        assets() {
            let assets: Asset[] = [];
            for(const user in this.stakingStore.assets) {
                for(const unit in this.stakingStore.assets[user]) {
                    const parse = fromUnit(unit)
                    assets.push({
                        unit,
                        policyId: parse.policyId,
                        name: parse.assetName?toText(parse.assetName):""
                    })
                }
            }

            assets = assets.filter((value, index, self) =>
                index === self.findIndex((t) => (
                    t.unit === value.unit
                ))
            );

            return assets;
        },
        isValid() {
            return (
                this.createData.policyId
                && this.createData.timeout > 0
                && this.createData.lovelace > 0
                && this.createData.max
                && this.createData.reward.policyId
                && this.createData.reward.name
                && this.createData.reward.amount > 0
                && this.createData.reward.time > 0
                && this.createData.reward.timeout > 0
            )
        },
        contractList() {
            let contractList = this.stakingStore.contractList;
            if(this.createData.policyId) {
                contractList = contractList.filter((c => c.datum.policyId == this.createData.policyId))
            }

            if(this.createData.reward.policyId) {
                contractList = contractList.filter((c => c.datum.reward.policyId == this.createData.reward.policyId))
            }
            if(this.createData.reward.name) {
                const name = fromText(this.createData.reward.name);
                contractList = contractList.filter((c => {
                    console.log(c.datum.reward.name, name);
                    return c.datum.reward.name == name

            }))
            }
            return contractList;
        }
    },
    methods: {
        select() {
            if(this.asset) {
                this.createData.reward.policyId = this.asset.policyId;
                this.createData.reward.name = this.asset.name;
            }
        },
        fill(contract: Contract) {
            this.createData.policyId = contract.datum.policyId;
            this.createData.lovelace = Number(contract.datum.lovelace);
            this.createData.reward.policyId = contract.datum.reward.policyId
            this.createData.reward.name = toText(contract.datum.reward.name);
            this.createData.reward.amount = Number(contract.datum.reward.amount);
            this.createData.reward.time = Number(contract.datum.reward.time);
            this.createData.reward.timeout = Number(contract.datum.reward.timeout);
        },
        async create() {
            const lucid = await this.stakingStore.getWallet('owner');
            const signedTx = await contractCreate(lucid, this.createData.policyId, BigInt(this.createData.timeout), {
                policyId: this.createData.reward.policyId,
                name: this.createData.reward.name,
                amount: BigInt(this.createData.reward.amount),
                time: BigInt(this.createData.reward.time),
                timeout: BigInt(this.createData.reward.timeout)
            }, BigInt(this.createData.lovelace), BigInt(this.createData.max), this.stakingStore.debug);

            const txHash = await signedTx.submit();
            console.log(`Submitted transaction: ${txHash}`);
            await lucid.awaitTx(txHash);
            console.log(`Confirmed`);
        },
        async reload() {
            await this.stakingStore.loadUTxOs();
        }
    }
}
</script>