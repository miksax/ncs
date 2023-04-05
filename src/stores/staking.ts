import { defineStore } from "pinia";
import {
  type Assets,
  Blockfrost,
  C,
  Constr,
  Data,
  fromHex,
  fromText,
  Lucid,
  type Network,
  type PolicyId,
  toHex,
  type Unit,
  type UTxO,
  datumJsonToCbor,
} from "lucid-cardano";
import { createMintingPolicy, getWalletHash, hashDatumMain, readValidator, type Contract, type Leaf, DatumMain, DatumLeaf, type Validate, databaseSort } from "../staking";

type Filter = {
  owner: string;
  policyId: PolicyId;
  validate: Validate;
  rewardPolicyId: PolicyId;
  rewardName: string;
};

type Store = {
  debug: boolean,
  blockfrostApi: string;
  blockfrostToken: string;
  blockfrostNetwork: Network;
  // Hold the keys
  keys: Record<string, string>;
  // Hold address map
  addresses: Record<string, string>;
  // Hold assets map
  assets: Record<string, Assets>;
  // Precalculated policy IDs
  policyIds: Record<string, string>;
  // Hold UTxO of all active transaction contract address
  utxos: UTxO[];
  // Hold context of running contract
  //context: Context;
  // Filter relevant context
  filter: Filter | null;
};

export const stakingStore = defineStore("staking", {
  state: () => {
    const json = localStorage.getItem("store");

    if (json) {
      const data = JSON.parse(json) as Store;
      data.policyIds = {};
      return data;
    } else {
      return {
        debug: true,
        blockfrostApi: "",
        blockfrostToken: "",
        blockfrostNetwork: "Preview",
        keys: {},
        addresses: {},
        policyIds: {},
        assets: {},
        utxos: [],
        filter: null,
      } as Store;
    }
  },
  getters: {
    isBlockfrostSetup(state) {
      return state.blockfrostApi && state.blockfrostNetwork &&
        state.blockfrostToken &&
        "owner" in state.keys && "staker" in state.keys && state.keys.owner &&
        state.keys.staker;
    },
    owner(state) {
      return {
        address: state.addresses["owner"],
        assets: state.assets["owner"],
      };
    },
    staker(state) {
      return {
        address: state.addresses["staker"],
        assets: state.assets["staker"],
      };
    },
    contractList(state) {
      const contractList: Contract[] = [];
      for(const utxoMain of state.utxos) {
        if(utxoMain.outputIndex == 0 && utxoMain.datum) {
          const datumMain = Data.from<DatumMain>(utxoMain.datum, DatumMain);
          if(datumMain) {
            const contract = {
              hash: hashDatumMain(datumMain),
              utxo: utxoMain,
              datum: {
                owner: datumMain.owner,
                validate: datumMain.validate,
                policyId: datumMain.policyId,
                expiration: BigInt(datumMain.expiration),
                reward: {
                  name: datumMain.reward.name,
                  policyId: datumMain.reward.policyId,
                  amount: BigInt(datumMain.reward.amount),
                  time: BigInt(datumMain.reward.time),
                  timeout: BigInt(datumMain.reward.timeout),
                },
                lovelace: BigInt(datumMain.lovelace),
                count: BigInt(datumMain.count),
                first: datumMain.first
              },
              database: []

            } as Contract;

            for (const utxoLeaf of state.utxos) {
              if(utxoLeaf.outputIndex > 0 && utxoLeaf.datum) {
                const datumLeaf = Data.from<DatumLeaf>(utxoLeaf.datum, DatumLeaf);
                if(datumLeaf.hash == contract.hash) {
                  contract.database.push({
                    utxo: utxoLeaf,
                    datum: datumLeaf
                  })
                }
              }
            }

            databaseSort(contract.database);
            contractList.push(contract);
          }
        }
      }
      return contractList;
    },
  },
  actions: {
    /**
     * Load wallet and assets
     */
    async getWallet(name: string) {
      const key = this.keys[name];
      const lucid = await Lucid.new(
        new Blockfrost(
          this.blockfrostApi,
          this.blockfrostToken,
        ),
        this.blockfrostNetwork,
      );
      lucid.selectWalletFromPrivateKey(key);
      return lucid;
    },
    async loadWallet(name: string) {
      const lucid = await this.getWallet(name);
      this.addresses[name] = await lucid.wallet.address();
      this.policyIds[name] = lucid.utils.mintingPolicyToId(
        await createMintingPolicy(lucid),
      );
      this.assets[name] = {};

      const utxos = await lucid.wallet.getUtxos();
      for (const utxo of utxos) {
        for (const asset in utxo.assets) {
          if (asset in this.assets[name]) {
            this.assets[name][asset] += utxo.assets[asset];
          } else {
            this.assets[name][asset] = utxo.assets[asset];
          }
        }
      }
      this.saveLocalStorage();
    },
    /**
     * Load all connected wallets
     */
    async loadWallets() {
      for (const key in this.keys) {
        await this.loadWallet(key);
      }
    },

    /**
     * Load all open UTxO from Blockfrost
     */
    async loadUTxOs() {
      const lucid = await Lucid.new(
        new Blockfrost(
          this.blockfrostApi,
          this.blockfrostToken,
        ),
        this.blockfrostNetwork,
      );
      console.log(this.debug);
      const validator = await readValidator(this.debug);
      const contractAddress = lucid.utils.validatorToAddress(validator);
      this.utxos = await lucid.utxosAt(contractAddress);
      console.log(contractAddress);

      this.saveLocalStorage()
    },

    /**
     * Load all important data from blockfrost
     */
    async load() {
      console.log("Loading store from blockfrost");
      await this.loadWallets();
      await this.loadUTxOs();

      this.saveLocalStorage();
    },

    /**
     * save to local storage
     */
    saveLocalStorage() {
      console.log("Storing to local storage");
      localStorage.setItem(
        "store",
        JSON.stringify(
          {
            debug: this.debug,
            blockfrostApi: this.blockfrostApi,
            blockfrostNetwork: this.blockfrostNetwork,
            blockfrostToken: this.blockfrostToken,
            keys: this.keys,
            addresses: this.addresses,
            policyIds: this.policyIds,
            utxos: this.utxos,
            assets: this.assets,
            filter: this.filter,
          },
          (key, value) => typeof value === "bigint" ? Number(value) : value,
          2,
        ),
      );
    },

    /**
     * get data from local storage
     */
    loadLocalStorage() {
      const json = localStorage.getItem("store");
      if (json) {
        const data = JSON.parse(json) as Store;
        this.blockfrostApi = data.blockfrostApi;
        this.blockfrostNetwork = data.blockfrostNetwork;
        this.blockfrostToken = data.blockfrostToken;
        this.keys = data.keys;
        this.addresses = data.addresses;
        this.utxos = data.utxos;
        this.assets = data.assets;
        this.filter = data.filter;
      } else {
        console.log("Loading store failed");
      }
    },

    /**
     *  Add new key to the wallet
     */
    async setKey(name: string, key: string | undefined) {
      if (!key) {
        key = await this.genKey();
      }

      this.keys[name] = key;
      await this.loadWallet(name);
    },

    /**
     * Generate new private key
     */
    async genKey() {
      const lucid = await Lucid.new(undefined, this.blockfrostNetwork);

      const key = lucid.utils.generatePrivateKey();
      console.log(`Generating private key: ${key}`);
      return key;
    },

    /**
     * Send between internal wallets
     */
    async send(nameFrom: string, addressTo: string, assets: Assets) {
      const wallet = await this.getWallet(nameFrom);
      const tx = await wallet.newTx().payToAddress(addressTo, assets)
        .complete();
      const signedTx = await tx.sign().complete();
      const txHash = await signedTx.submit();
      await wallet.awaitTx(txHash);
      return txHash;
    },

    // Mint transaction for playing with assets
    async mint(
      nameFrom: string,
      addressTo: string,
      name: string,
      amount: bigint,
    ) {
      const wallet = await this.getWallet(nameFrom);
      const mintingPolicy = await createMintingPolicy(wallet);
      const mintingPolicyId = wallet.utils.mintingPolicyToId(mintingPolicy);
      const unit = mintingPolicyId + fromText(name);
      let txBuilder = wallet.newTx().mintAssets({
        [unit]: amount,
      }, Data.to(new Constr(0, [])));

      // if there is amount > 0, send to address
      if (amount > 0) {
        txBuilder = txBuilder.payToAddress(addressTo, { [unit]: amount });
      }
      const tx = await txBuilder
        .attachMintingPolicy(mintingPolicy)
        .addSigner(this.addresses[nameFrom])
        .complete();
      const signedTx = await tx.sign().complete();
      const txHash = await wallet.awaitTx(await signedTx.submit());
      return txHash;
    },
  },
});
