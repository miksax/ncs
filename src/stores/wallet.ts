import { defineStore } from "pinia";
import { Blockfrost, Lucid } from "lucid-cardano";
import wallet from "../wallets.json";

async function load(sig: string): Promise<Lucid> {
  const lucid = await Lucid.new(
    new Blockfrost(
      "https://cardano-preview.blockfrost.io/api/v0",
      "previewmesUawO2pPjx7zOA7Q2u1kYI4GdZLYsl",
    ),
    "Preview",
  );
  lucid.selectWalletFromPrivateKey(sig);
  return lucid;
}

export const walletStore = defineStore("wallet", {
  state: () => {
    return wallet;
  },
  actions: {
    async ownerWallet(state): Promise<Lucid> {
      return await load(state.owner);
    },
    async beneficierWallet(state) {
      return await load(state.owner);
    },
  },
});
