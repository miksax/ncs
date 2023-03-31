import {
  applyDoubleCborEncoding,
  applyParamsToScript,
  Blockfrost,
  C,
  Constr,
  Data,
  fromHex,
  fromText,
  Lucid,
  type MintingPolicy,
  type OutRef,
  type PolicyId,
  type SpendingValidator,
  toHex,
  type TxHash,
  TxSigned,
  type Unit,
} from "lucid-cardano";
import plutus from "./plutus.json";

export const OWNER = "owner";
export const BENEFICIENT = "beneficient";
export const MINT_NFTs = [
  "Apple",
  "Banana",
  "Orange",
  "Peach",
  "Shitake",
  "Romadur",
];
export const MINT_REWARD = "Miksa Reward";
export const VALIDATOR = "Stake Validator";

const now = BigInt(new Date().getTime());
const debug = true;

function validFrom(): number {
  return Number(now - BigInt(10000000));
}

export enum Redeemer {
  "AssetAdd",
  "AssetPayout",
  "AssetRenew",
  "AssetClose",
  "Renew",
  "Close",
  "Collect",
}

export type Creadential = {
  addr: string;
  sig: string;
};

export type UTxO = {
  txHash: string;
  outputIndex: bigint;
};

export type Contract = {
  utxo: UTxO;
  datum: DatumMainType;
};

export type Leaf = {
  utxo: UTxO;
  datum: DatumLeafType;
};

export type Context = {
  contract: Contract | null;
  database: Leaf[];
};

export const Validate = Data.Object({
  policyId: Data.Bytes(),
  name: Data.Bytes(),
});
export type Validate = Data.Static<typeof Validate>;
export type ValidateType = {
  policyId: PolicyId;
  name: string;
};

export const Reward = Data.Object({
  policyId: Data.Bytes(),
  name: Data.Bytes(),
  amount: Data.Integer(),
  time: Data.Integer(),
  expiration: Data.Integer(),
});
export type Reward = Data.Static<typeof Reward>;
export type RewardType = {
  policyId: PolicyId;
  name: string;
  amount: bigint;
  time: bigint;
  expiration: bigint;
};

export type DatumMainType = {
  owner: string;
  validate: ValidateType;
  policyId: PolicyId;
  timeout: bigint;
  reward: RewardType;
  lovelace: bigint;
  count: bigint;
  first: string | null;
};

export const DatumMain = Data.Object({
  owner: Data.Bytes(), // Owner og the contract
  validate: Validate, // Validate token
  policyId: Data.Bytes(),
  timeout: Data.Integer(),
  reward: Reward,
  lovelace: Data.Integer(),
  count: Data.Integer(),
  first: Data.Nullable(Data.Bytes()),
});
export type DatumMain = Data.Static<typeof DatumMain>;

export const DatumLeaf = Data.Object({
  name: Data.Bytes(),
  policyId: Data.Bytes(),
  owner: Data.Bytes(),
  beneficient: Data.Bytes(),
  validate: Validate,
  start: Data.Integer(),
  expiration: Data.Integer(),
  time: Data.Integer(),
  amount: Data.Integer(),
  next: Data.Nullable(Data.Bytes()),
});
export type DatumLeaf = Data.Static<typeof DatumLeaf>;
export type DatumLeafType = {
  name: string;
  policyId: PolicyId;
  owner: string;
  beneficient: string;
  validate: ValidateType;
  start: bigint;
  expiration: bigint;
  time: bigint;
  amount: bigint;
  next: string | null;
};

export async function loadContext(): Promise<Context> {
  const data = {} as Context; //JSON.parse(await Deno.readTextFile("context.json"));
  if (data.contract) {
    const contract = data.contract;
    contract.utxo.outputIndex = BigInt(contract.utxo.outputIndex);
    contract.datum.lovelace = BigInt(contract.datum.lovelace);
    contract.datum.timeout = BigInt(contract.datum.timeout);
    contract.datum.reward.amount = BigInt(contract.datum.reward.amount);
    contract.datum.reward.expiration = BigInt(contract.datum.reward.expiration);
    contract.datum.reward.time = BigInt(contract.datum.reward.time);
    contract.datum.count = BigInt(contract.datum.count);
  }

  for (const leaf of data.database) {
    leaf.utxo.outputIndex = BigInt(leaf.utxo.outputIndex);
    leaf.datum.start = BigInt(leaf.datum.start);
    leaf.datum.expiration = BigInt(leaf.datum.expiration);
    leaf.datum.amount = BigInt(leaf.datum.amount);
    leaf.datum.time = BigInt(leaf.datum.time);
  }
  return data;
}

export async function getWalletHash(lucid: Lucid): Promise<string> {
  const address = await lucid.wallet.address();
  if (address) {
    const details = lucid.utils.getAddressDetails(address);
    if (details.paymentCredential) {
      return details.paymentCredential.hash;
    }
  }
  throw new Error("Not walid wallet");
}

export async function readValidator(
  debug: boolean,
): Promise<SpendingValidator> {
  const validator = plutus.validators.find((v) =>
    v.title === "staking.staking"
  );
  const script = applyParamsToScript(validator!.compiledCode, [
    debug ? new Constr(1, []) : new Constr(0, []),
  ]);

  return {
    type: "PlutusV2",
    script: applyDoubleCborEncoding(script),
  };
}

export async function createValidatePolicy(
  lucid: Lucid,
  debug: boolean,
): Promise<MintingPolicy> {
  const script_hash = lucid.utils.getAddressDetails(
    lucid.utils.validatorToAddress(
      await readValidator(debug),
    ),
  ).paymentCredential?.hash!;
  const validator = plutus.validators.find((v) => v.title === "staking.asset");
  const script = applyParamsToScript(validator!.compiledCode, [
    script_hash,
    fromText(VALIDATOR),
  ]);

  return {
    type: "PlutusV2",
    script: applyDoubleCborEncoding(script),
  };
}

export async function createMintingPolicy(
  lucid: Lucid,
): Promise<MintingPolicy> {
  const address_hash = await getWalletHash(lucid);

  const validator = plutus.validators.find((v) =>
    v.title === "staking.minting"
  );
  const script = applyParamsToScript(validator!.compiledCode, [
    address_hash,
  ]);

  return {
    type: "PlutusV2",
    script: applyDoubleCborEncoding(script),
  };
}

export function hash(data: string): string {
  return toHex(C.hash_blake2b256(fromHex(data)));
}

export function hashDatumMain(datum: DatumMainType): string {
  const data = datum.validate.policyId + datum.validate.name + datum.policyId;
  return hash(data);
}

export class Stake {
  public ctx: Context;

  constructor(ctx: Context) {
    this.ctx = ctx;
    this.databaseSort();
  }

  databaseSort() {
    this.ctx.database.sort((a, b) => {
      if (a.datum.name > b.datum.name) {
        return 1;
      }

      if (a.datum.name < b.datum.name) {
        return -1;
      }

      return 0;
    });
  }

  databaseGet(name: string): Leaf {
    if (this.ctx.database.length === 0) {
      throw new Error(`Record does not exist: ${name}`);
    }

    for (const leaf of this.ctx.database) {
      if (leaf.datum.name === name) {
        return leaf;
      }
    }

    throw new Error(`Record does not exist: ${name}`);
  }

  /**
   * Get previos record from database
   * if there is not relevant record, return null
   */
  databaseGetPrev(name: string): Leaf | null {
    // To be sure, that DB is sorted
    this.databaseSort();
    if (this.ctx.database.length == 0) {
      return null;
    }

    for (const leaf of this.ctx.database) {
      if (leaf.datum.next == name) {
        return leaf;
      }

      // Record should be first
      if (name < leaf.datum.name || name == leaf.datum.name) {
        return null;
      }

      // Regular placement
      if (
        name > leaf.datum.name &&
        (leaf.datum.next === null || name < leaf.datum.next)
      ) {
        return leaf;
      }

      // There is no another record
      if (leaf.datum.next === null) {
        return leaf;
      }
    }

    throw new Error("Bad database consistency");
  }

  calculateReward(main: DatumMainType, leaf: DatumLeafType): bigint {
    const end = Math.min(
      Number(main.timeout), // Should be bigger then leaf
      Number(leaf.expiration), // expired leaf
      Number(now), // Current timestamp
    );
    const duration = end - Number(leaf.start);

    const reward = BigInt(
      Math.max(
        0,
        Math.floor(duration * Number(leaf.amount) / Number(leaf.time)),
      ),
    );

    console.log(
      `Reward: ${reward}, end: ${end} start: ${leaf.start} duration: ${duration}`,
    );
    return reward;
    //return 1200BigInt(0);
  }

  calculateRunningReward(
    input: DatumMainType,
    timeout: bigint,
    amount: bigint,
    time: bigint,
    max: bigint,
  ): bigint {
    const prev = input.reward.expiration * input.reward.amount * input.count /
      input.reward.time;
    const current = (timeout * amount * max) / time;
    return prev + current;
  }

  calculateExpiration(main: DatumMainType): bigint {
    return BigInt(
      Math.min(
        Number(main.timeout),
        Number(now + main.reward.expiration),
      ),
    );
  }

  calculateStart() {
    return now;
  }

  /**
   * Create new contract
   * - atach validator and a validator assets
   * - setup properties
   */
  async contractCreate(
    owner: Lucid,
    policyId: PolicyId,
    timeout: bigint,
    reward: {
      policyId: PolicyId;
      name: string;
      amount: bigint;
      time: bigint;
      expiration: bigint;
    },
    lovelace: bigint,
    max: bigint,
  ): Promise<TxSigned> {
    const validator = await readValidator(debug);
    const contractAddress = owner.utils.validatorToAddress(validator);
    const validatePolicy = await createValidatePolicy(owner, debug);
    const validatePolicyId = owner.utils.mintingPolicyToId(validatePolicy);

    const datumData: DatumMainType = {
      owner: await getWalletHash(owner),
      validate: {
        policyId: validatePolicyId,
        name: fromText(VALIDATOR),
      },
      policyId,
      timeout: now + timeout,
      reward: {
        policyId: reward.policyId,
        name: fromText(reward.name),
        amount: reward.amount,
        time: reward.time,
        expiration: reward.expiration,
      },
      lovelace,
      first: null,
      count: BigInt(0),
    };

    const rewardUnit: Unit = reward.policyId + fromText(reward.name);
    const rewardAmount = BigInt((timeout * max * reward.amount) / reward.time);
    const validateUnit: Unit = validatePolicyId + fromText(VALIDATOR);
    const assets = {
      lovelace,
      [rewardUnit]: rewardAmount,
      [validateUnit]: max,
    };
    console.log(assets);
    const tx = await owner
      .newTx()
      .mintAssets({ [validateUnit]: max }, Data.to(new Constr(0, [])))
      .payToContract(contractAddress, {
        inline: Data.to<DatumMain>(datumData, DatumMain),
      }, assets)
      .attachMintingPolicy(validatePolicy)
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    this.ctx.contract = {
      utxo: {
        txHash,
        outputIndex: BigInt(0),
      },
      datum: datumData,
    };
    // Clear database
    this.ctx.database = [];
    return signedTx;
  }

  async contractRenew(
    owner: Lucid,
    timeout: bigint,
    lovelace: bigint,
    expiration: bigint,
    time: bigint,
    amount: bigint,
    max: bigint,
  ): Promise<TxSigned> {
    if (this.ctx.contract === null) {
      throw new Error("There is no running contract");
    }

    //const redeemer = Data.to(new Constr(6, []));
    const redeemer = Data.to(new Constr(4, [now]));
    const validator = await readValidator(debug);
    const contractAddress = owner.utils.validatorToAddress(validator);
    const query = [{
      txHash: this.ctx.contract.utxo.txHash,
      outputIndex: Number(this.ctx.contract.utxo.outputIndex),
    }];

    const [utxo] = await owner.utxosByOutRef(query);

    const rewardUnit: Unit = this.ctx.contract.datum.reward.policyId +
      this.ctx.contract.datum.reward.name;
    const rewardAmount = this.calculateRunningReward(
      this.ctx.contract.datum,
      timeout,
      amount,
      time,
      max,
    );
    const validateUnit: Unit = this.ctx.contract.datum.validate.policyId +
      this.ctx.contract.datum.validate.name;

    console.log(
      `Timeout: ${timeout} expiration: ${expiration} time: ${time} max: ${max} amount: ${amount}`,
    );

    const assets = {
      lovelace,
      [rewardUnit]: BigInt(
        Math.max(Number(rewardAmount), Number(utxo.assets[rewardUnit])),
      ),
    };

    const validationMint = max -
      (validateUnit in utxo.assets ? utxo.assets[validateUnit] : BigInt(0)) -
      this.ctx.contract.datum.count;
    assets[validateUnit] = max - this.ctx.contract.datum.count;
    console.log(utxo.assets, assets);

    this.ctx.contract.datum.lovelace = lovelace;
    this.ctx.contract.datum.timeout = now + timeout;
    this.ctx.contract.datum.reward.amount = amount;
    this.ctx.contract.datum.reward.expiration = expiration;
    this.ctx.contract.datum.reward.time = time;

    console.log(`Mint: ${validationMint}`);

    let txBuilder = owner
      .newTx()
      .collectFrom([utxo], redeemer);

    if (validationMint !== BigInt(0)) {
      txBuilder = txBuilder
        .mintAssets({
          [validateUnit]: validationMint,
        }, Data.to(new Constr(0, [])))
        .attachMintingPolicy(await createValidatePolicy(owner, debug));
    }
    const tx = await txBuilder
      .payToContract(contractAddress, {
        inline: Data.to<DatumMain>(this.ctx.contract.datum, DatumMain),
      }, assets)
      .addSigner(await owner.wallet.address())
      .validFrom(validFrom())
      .attachSpendingValidator(validator)
      .complete();

    const signedTx = await tx.sign().complete();
    const txHash = await signedTx.submit();
    this.ctx.contract.utxo.txHash = txHash;

    return signedTx;
  }

  async contractClose(
    owner: Lucid,
  ): Promise<TxSigned> {
    if (this.ctx.contract === null) {
      throw new Error("There is no running contract");
    }

    const redeemer = Data.to(new Constr(5, []));
    const validator = await readValidator(debug);
    const collect: Array<OutRef> = [{
      txHash: this.ctx.contract.utxo.txHash,
      outputIndex: Number(this.ctx.contract.utxo.outputIndex),
    }];

    for (const leaf of this.ctx.database) {
      collect.push({
        txHash: leaf.utxo.txHash,
        outputIndex: Number(leaf.utxo.outputIndex),
      });
    }

    const utxos = await owner.utxosByOutRef(collect);
    const tx = await owner
      .newTx()
      .collectFrom(utxos, redeemer)
      .addSigner(await owner.wallet.address())
      .validFrom(validFrom())
      .attachSpendingValidator(validator)
      .complete();

    const signedTx = await tx
      .sign()
      .complete();

    console.log(tx);

    await signedTx.submit();
    this.ctx.contract = null;
    this.ctx.database = [];
    return signedTx;
  }

  /**
   * Stake new NFT asset
   * Add new leaf
   * If there is a need, replace previos one
   */
  async contractAssetAdd(
    beneficient: Lucid,
    name: string,
  ): Promise<TxSigned> {
    if (this.ctx.contract === null) {
      throw new Error("There is no running contract");
    }

    const redeemer = Data.to(new Constr(0, []));
    // const redeemer = Data.to(new Constr(6, []));
    const validator = await readValidator(debug);
    const contractAddress = beneficient.utils.validatorToAddress(validator);

    const contract = this.ctx.contract;
    const prev = this.databaseGetPrev(name);
    let next = null;

    if (prev !== null) {
      next = prev.datum.next;
      prev.datum.next = name;
    } else {
      next = contract.datum.first;
      contract.datum.first = name;
    }
    contract.datum.count += BigInt(1);
    const [utxo] = await beneficient.utxosByOutRef([{
      txHash: contract.utxo.txHash,
      outputIndex: Number(contract.utxo.outputIndex),
    }]);

    const utxos = [utxo];

    const nftDatumData: DatumLeafType = {
      name,
      policyId: contract.datum.policyId,
      owner: contract.datum.owner,
      beneficient: await getWalletHash(beneficient),
      validate: contract.datum.validate,
      start: this.calculateStart(),
      expiration: this.calculateExpiration(contract.datum),
      amount: contract.datum.reward.amount,
      time: contract.datum.reward.time,
      next,
    };

    const rewardUnit: Unit = contract.datum.reward.policyId +
      contract.datum.reward.name;
    const validateUnit: Unit = contract.datum.validate.policyId +
      contract.datum.validate.name;
    const nftUnit: Unit = nftDatumData.policyId + nftDatumData.name;

    console.log(contract.datum);
    console.log(nftDatumData);

    let txBuilder = beneficient
      .newTx()
      .collectFrom(utxos, redeemer)
      // Attach main contract
      .payToContract(contractAddress, {
        inline: Data.to<DatumMain>(contract.datum, DatumMain),
      }, {
        lovelace: contract.datum.lovelace,
        [rewardUnit]: utxo.assets[rewardUnit],
        [validateUnit]: utxo.assets[validateUnit] - BigInt(1),
      })
      // New record of NFT
      .payToContract(contractAddress, {
        inline: Data.to<DatumLeaf>(nftDatumData, DatumLeaf),
      }, {
        lovelace: contract.datum.lovelace,
        [validateUnit]: BigInt(1),
      });

    // If there is exist record, create new one
    if (prev !== null) {
      const [utxo] = await beneficient.utxosByOutRef([{
        txHash: prev.utxo.txHash,
        outputIndex: Number(prev.utxo.outputIndex),
      }]);
      console.log(prev.datum);
      txBuilder = txBuilder
        .collectFrom([utxo], redeemer)
        .payToContract(contractAddress, {
          inline: Data.to<DatumLeaf>(prev.datum, DatumLeaf),
        }, utxo.assets);
    }

    const tx = await txBuilder
      .payToAddress(await beneficient.wallet.address(), {
        [nftUnit]: BigInt(1),
      })
      .addSigner(await beneficient.wallet.address())
      .validFrom(validFrom())
      .attachSpendingValidator(validator)
      .complete();

    const signedTx = await tx
      .sign()
      .complete();

    const txHash = await signedTx.submit();

    contract.utxo.txHash = txHash;
    // Push new record
    this.ctx.database.push({
      datum: nftDatumData,
      utxo: {
        txHash: txHash,
        outputIndex: BigInt(1),
      },
    });

    // Update prev record
    if (prev !== null) {
      prev.utxo.txHash = txHash;
      prev.utxo.outputIndex = BigInt(2);
    }
    return signedTx;
  }

  async contractAssetPayout(
    beneficient: Lucid,
    name: string,
  ): Promise<TxSigned> {
    if (this.ctx.contract === null) {
      throw new Error("There is no running contract");
    }

    // Redemer for payout must have current timestamp
    //const redeemer = Data.to(new Constr(1, [now]));
    const redeemer = Data.to(new Constr(6, []));
    const validator = await readValidator(debug);
    const contractAddress = beneficient.utils.validatorToAddress(validator);

    const contract = this.ctx.contract;
    const prev = this.databaseGetPrev(name);
    const current = this.databaseGet(name);

    const query = [
      {
        txHash: contract.utxo.txHash,
        outputIndex: Number(contract.utxo.outputIndex),
      },
      {
        txHash: current.utxo.txHash,
        outputIndex: Number(current.utxo.outputIndex),
      },
    ];

    if (prev !== null) {
      prev.datum.next = current.datum.next;
      query.push({
        txHash: prev.utxo.txHash,
        outputIndex: Number(prev.utxo.outputIndex),
      });
    } else {
      contract.datum.first = current.datum.next;
    }

    contract.datum.count -= BigInt(1);
    const utxo_query = await beneficient.utxosByOutRef(query);
    const utxo = utxo_query.find((u) =>
      u.txHash === contract.utxo.txHash &&
      u.outputIndex === Number(contract.utxo.outputIndex)
    )!;
    const leaf = utxo_query.find((u) =>
      u.txHash === current.utxo.txHash &&
      u.outputIndex === Number(current.utxo.outputIndex)
    )!;

    let leaf_pred = null;

    const utxos = [utxo, leaf];
    if (prev !== null) {
      leaf_pred = utxo_query.find((u) =>
        u.txHash === prev.utxo.txHash &&
        u.outputIndex === Number(prev.utxo.outputIndex)
      )!;
      utxos.push(
        leaf_pred,
      );
    }

    const rewardUnit: Unit = contract.datum.reward.policyId +
      contract.datum.reward.name;
    const validateUnit: Unit = contract.datum.validate.policyId +
      contract.datum.validate.name;
    const nftUnit: Unit = current.datum.policyId + current.datum.name;

    const reward = this.calculateReward(contract.datum, current.datum);

    const assets = {
      lovelace: contract.datum.lovelace,
      [rewardUnit]: utxo.assets[rewardUnit] - reward,
      [validateUnit]:
        (validateUnit in utxo.assets ? utxo.assets[validateUnit] : BigInt(0)) +
        BigInt(1),
    };

    console.log(assets);

    let txBuilder = beneficient
      .newTx()
      .collectFrom(utxos, redeemer)
      .payToContract(contractAddress, {
        inline: Data.to<DatumMain>(contract.datum, DatumMain),
      }, assets);

    if (prev !== null) {
      txBuilder = txBuilder
        .collectFrom([leaf_pred!], redeemer)
        .payToContract(contractAddress, {
          inline: Data.to<DatumLeaf>(prev.datum, DatumLeaf),
        }, leaf_pred!.assets);
    }

    console.log(
      `Alive1: ${now} ${
        now < current.datum.expiration
      } ${current.datum.expiration}`,
    );

    txBuilder = txBuilder
      .payToAddress(await beneficient.wallet.address(), {
        [nftUnit]: BigInt(1),
      })
      .addSigner(await beneficient.wallet.address())
      .validFrom(validFrom())
      .attachSpendingValidator(validator);

    console.log(`Alive2: ${nftUnit}`);
    const tx = await txBuilder.complete();

    const signedTx = await tx
      .sign()
      .complete();

    console.log("Alive3");
    const txHash = await signedTx.submit();
    contract.utxo.txHash = txHash;
    if (prev !== null) {
      prev.utxo.txHash = txHash;
      prev.utxo.outputIndex = BigInt(1);
    }
    this.ctx.database.splice(
      this.ctx.database.findIndex((leaf) => leaf.datum.name === name),
      1,
    );
    console.log(txHash);
    return signedTx;
  }

  async contractAssetRenew(
    beneficient: Lucid,
    name: string,
  ): Promise<TxSigned> {
    if (this.ctx.contract === null) {
      throw new Error("There is no running contract");
    }

    const redeemer = Data.to(new Constr(2, []));
    //const redeemer = Data.to(new Constr(6, []));
    const validator = await readValidator(debug);
    const contractAddress = beneficient.utils.validatorToAddress(validator);

    const contract = this.ctx.contract;
    const current = this.databaseGet(name);

    const utxos = await beneficient.utxosByOutRef([
      {
        txHash: contract.utxo.txHash,
        outputIndex: Number(contract.utxo.outputIndex),
      },
      {
        txHash: current.utxo.txHash,
        outputIndex: Number(current.utxo.outputIndex),
      },
    ]);

    const utxo = utxos.find((u) =>
      u.txHash === contract.utxo.txHash &&
      u.outputIndex === Number(contract.utxo.outputIndex)
    )!;

    const rewardUnit: Unit = contract.datum.reward.policyId +
      contract.datum.reward.name;
    const validateUnit: Unit = contract.datum.validate.policyId +
      contract.datum.validate.name;
    const nftUnit: Unit = current.datum.policyId + current.datum.name;

    const reward = this.calculateReward(contract.datum, current.datum);
    current.datum.start = this.calculateStart();
    current.datum.expiration = this.calculateExpiration(contract.datum);
    current.datum.time = contract.datum.reward.time;
    current.datum.amount = contract.datum.reward.amount;

    const tx = await beneficient
      .newTx()
      .collectFrom(utxos, redeemer)
      // Attach main contract
      .payToContract(contractAddress, {
        inline: Data.to<DatumMain>(contract.datum, DatumMain),
      }, {
        lovelace: contract.datum.lovelace,
        [rewardUnit]: utxo.assets[rewardUnit] - reward,
        [validateUnit]:
          (validateUnit in utxo.assets ? utxo.assets[validateUnit] : BigInt(0)),
      })
      .payToContract(contractAddress, {
        inline: Data.to<DatumLeaf>(current.datum, DatumLeaf),
      }, {
        lovelace: contract.datum.lovelace,
        [validateUnit]: BigInt(1),
      })
      .payToAddress(await beneficient.wallet.address(), {
        [nftUnit]: BigInt(1),
      })
      .addSigner(await beneficient.wallet.address())
      .validFrom(validFrom())
      .attachSpendingValidator(validator)
      .complete();

    const signedTx = await tx
      .sign()
      .complete();

    const txHash = await signedTx.submit();

    contract.utxo.txHash = txHash;
    current.utxo.txHash = txHash;
    current.utxo.outputIndex = BigInt(1);
    return signedTx;
  }

  /**
   * Close by main contract owner
   */
  async contractAssetClose(owner: Lucid, name: string): Promise<TxSigned> {
    if (this.ctx.contract === null) {
      throw new Error("There is no running contract");
    }

    const redeemer = Data.to(new Constr(3, []));
    //const redeemer = Data.to(new Constr(6, []));
    const validator = await readValidator(debug);
    const contractAddress = owner.utils.validatorToAddress(validator);

    const contract = this.ctx.contract;
    const prev = this.databaseGetPrev(name);
    const current = this.databaseGet(name);

    if (prev !== null) {
      prev.datum.next = current.datum.next;
    } else {
      contract.datum.first = current.datum.next;
    }

    contract.datum.count -= BigInt(1);
    const [utxo, leaf] = await owner.utxosByOutRef([
      {
        txHash: contract.utxo.txHash,
        outputIndex: Number(contract.utxo.outputIndex),
      },
      {
        txHash: current.utxo.txHash,
        outputIndex: Number(current.utxo.outputIndex),
      },
    ]);

    const utxos = [utxo, leaf];

    const rewardUnit: Unit = contract.datum.reward.policyId +
      contract.datum.reward.name;
    const validateUnit: Unit = contract.datum.validate.policyId +
      contract.datum.validate.name;

    let txBuilder = owner
      .newTx()
      .collectFrom(utxos, redeemer)
      // Attach main contract
      .payToContract(contractAddress, {
        inline: Data.to<DatumMain>(contract.datum, DatumMain),
      }, {
        lovelace: utxo.assets.lovelace,
        [rewardUnit]: utxo.assets[rewardUnit],
        [validateUnit]: (validateUnit in utxo.assets
          ? utxo.assets[validateUnit]
          : BigInt(0)) + BigInt(1),
      });

    if (prev !== null) {
      const [utxo] = await owner.utxosByOutRef([{
        txHash: prev.utxo.txHash,
        outputIndex: Number(prev.utxo.outputIndex),
      }]);

      txBuilder = txBuilder
        .collectFrom([utxo], redeemer)
        .payToContract(contractAddress, {
          inline: Data.to<DatumLeaf>(prev.datum, DatumLeaf),
        }, utxo.assets);
    }
    const tx = await txBuilder
      .addSigner(await owner.wallet.address())
      .validFrom(validFrom())
      .attachSpendingValidator(validator)
      .complete();

    const signedTx = await tx
      .sign()
      .complete();

    const txHash = await signedTx.submit();

    contract.utxo.txHash = txHash;
    if (prev !== null) {
      prev.utxo.txHash = txHash;
      prev.utxo.outputIndex = BigInt(1);
    }
    this.ctx.database.splice(
      this.ctx.database.findIndex((leaf) => leaf.datum.name === name),
      1,
    );
    return signedTx;
  }
}
