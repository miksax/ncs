import {
  applyDoubleCborEncoding,
  applyParamsToScript,
  Blockfrost,
  C,
  Constr,
  Data,
  fromHex,
  fromText,
  type UTxO,
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
//const debug = true;

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

/*
export type UTxO = {
  txHash: string;
  outputIndex: bigint;
};
*/

export type Contract = {
  hash: string;
  utxo: UTxO;
  datum: DatumMain;
  database: Leaf[];
};

export type Leaf = {
  utxo: UTxO;
  datum: DatumLeaf;
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
  timeout: Data.Integer(),
});
export type Reward = Data.Static<typeof Reward>;
/*
export type RewardType = {
  policyId: PolicyId;
  name: string;
  amount: bigint;
  time: bigint;
  timeout: bigint;
};
*/
/*
export type DatumMainType = {
  owner: string;
  validate: ValidateType;
  policyId: PolicyId;
  expiration: bigint;
  reward: RewardType;
  lovelace: bigint;
  count: bigint;
  first: string | null;
};*/

export const DatumMain = Data.Object({
  owner: Data.Bytes(), // Owner og the contract
  validate: Validate, // Validate token
  policyId: Data.Bytes(),
  expiration: Data.Integer(),
  reward: Reward,
  lovelace: Data.Integer(),
  count: Data.Integer(),
  first: Data.Nullable(Data.Bytes()),
});
export type DatumMain = Data.Static<typeof DatumMain>;

export const DatumLeaf = Data.Object({
  name: Data.Bytes(),
  hash: Data.Bytes(),
  owner: Data.Bytes(),
  staker: Data.Bytes(),
  start: Data.Integer(),
  expiration: Data.Integer(),
  time: Data.Integer(),
  amount: Data.Integer(),
  next: Data.Nullable(Data.Bytes()),
});
export type DatumLeaf = Data.Static<typeof DatumLeaf>;
/*
export type DatumLeafType = {
  name: string;
  hash: string,
  owner: string;
  beneficient: string;
  start: bigint;
  expiration: bigint;
  time: bigint;
  amount: bigint;
  next: string | null;
};*/

export async function loadContext(): Promise<Context> {
  const data = {} as Context; //JSON.parse(await Deno.readTextFile("context.json"));
  if (data.contract) {
    const contract = data.contract;
    //contract.utxo.outputIndex = BigInt(contract.utxo.outputIndex);
    contract.datum.lovelace = BigInt(contract.datum.lovelace);
    contract.datum.expiration = BigInt(contract.datum.expiration);
    contract.datum.reward.amount = BigInt(contract.datum.reward.amount);
    contract.datum.reward.time = BigInt(contract.datum.reward.timeout);
    contract.datum.reward.time = BigInt(contract.datum.reward.time);
    contract.datum.count = BigInt(contract.datum.count);
  }

  for (const leaf of data.database) {
    //leaf.utxo.outputIndex = BigInt(leaf.utxo.outputIndex);
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

export function hashDatumMain(datum: DatumMain): string {
  //const data = datum.validate.policyId + datum.validate.name + datum.policyId;
  const data = [
    datum.owner,
    datum.validate.policyId,
    datum.validate.name,
    datum.policyId,
    datum.reward.policyId,
    datum.reward.name
  ];
  return hash(data.join(''));
}

export function databaseSort(database: Leaf[]) {
  database.sort((a, b) => {
    if (a.datum.name > b.datum.name) {
      return 1;
    }

    if (a.datum.name < b.datum.name) {
      return -1;
    }

    return 0;
  });
}

function getRedeemer(redemer: string, debug: boolean, force: boolean) {
  if (debug && force) {
    return Data.to(new Constr(6, []));
  } else {
    return redemer;
  }
}

export function databaseGet(database: Leaf[], name: string): Leaf {
  if (database.length === 0) {
    throw new Error(`Record does not exist: ${name}`);
  }

  for (const leaf of database) {
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
export function databaseGetPrev(database: Leaf[], name: string): Leaf | null {
  // To be sure, that DB is sorted
  databaseSort(database);
  if (database.length == 0) {
    return null;
  }

  for (const leaf of database) {
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

export function calculateReward(
  main: DatumMain,
  leaf: DatumLeaf,
): bigint {
  const end = Math.min(
    Number(main.expiration), // Should be bigger then leaf
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

export function calculateRunningReward(
  input: DatumMain,
  timeout: bigint,
  amount: bigint,
  time: bigint,
  max: bigint,
): bigint {
  const prev = input.reward.timeout * input.reward.amount * input.count /
    input.reward.time;
  const current = (timeout * amount * max) / time;
  return prev + current;
}

export function calculateExpiration(main: DatumMain): bigint {
  return BigInt(
    Math.min(
      Number(main.expiration),
      Number(now + main.reward.timeout),
    ),
  );
}

export function calculateStart() {
  return now;
}

/**
 * Create new contract
 * - atach validator and a validator assets
 * - setup properties
 */
export async function contractCreate(
  owner: Lucid,
  policyId: PolicyId,
  timeout: bigint,
  reward: {
    policyId: PolicyId;
    name: string;
    amount: bigint;
    time: bigint;
    timeout: bigint;
  },
  lovelace: bigint,
  max: bigint,
  debug: boolean
): Promise<TxSigned> {
  const validator = await readValidator(debug);
  const contractAddress = owner.utils.validatorToAddress(validator);
  const validatePolicy = await createValidatePolicy(owner, debug);
  const validatePolicyId = owner.utils.mintingPolicyToId(validatePolicy);

  const datumData: DatumMain = {
    owner: await getWalletHash(owner),
    validate: {
      policyId: validatePolicyId,
      name: fromText(VALIDATOR),
    },
    policyId,
    expiration: BigInt(now + timeout),
    reward: {
      policyId: reward.policyId,
      name: fromText(reward.name),
      amount: reward.amount,
      time: reward.time,
      timeout: reward.timeout,
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

  return await tx.sign().complete();
}

export async function contractRenew(
  contract: Contract,
  owner: Lucid,
  expiration: bigint,
  lovelace: bigint,
  timeout: bigint,
  time: bigint,
  amount: bigint,
  max: bigint,
  debug: boolean,
  force: boolean,
): Promise<TxSigned> {
  const redeemer = getRedeemer(Data.to(new Constr(4, [now])), debug, force);
  const validator = await readValidator(debug);
  const contractAddress = owner.utils.validatorToAddress(validator);
  const query = [{
    txHash: contract.utxo.txHash,
    outputIndex: Number(contract.utxo.outputIndex),
  }];

  const [utxo] = await owner.utxosByOutRef(query);

  const rewardUnit: Unit = contract.datum.reward.policyId +
    contract.datum.reward.name;
  const rewardAmount = calculateRunningReward(
    contract.datum,
    timeout,
    amount,
    time,
    max,
  );
  const validateUnit: Unit = contract.datum.validate.policyId +
    contract.datum.validate.name;

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
    contract.datum.count;
  assets[validateUnit] = max - contract.datum.count;
  console.log(utxo.assets, assets);

  contract.datum.lovelace = lovelace;
  contract.datum.expiration = now + timeout;
  contract.datum.reward.amount = amount;
  contract.datum.reward.timeout = timeout;
  contract.datum.reward.time = time;

  console.log(`Mint: ${validationMint}`);

  let txBuilder = owner
    .newTx()
    .collectFrom([utxo], redeemer);

  /*
  if (validationMint !== BigInt(0)) {
    txBuilder = txBuilder
      .mintAssets({
        [validateUnit]: validationMint,
      }, Data.to(new Constr(0, [])))
      .attachMintingPolicy(await createValidatePolicy(owner, debug));
  }
  */
  console.log(assets);
  const tx = await txBuilder
    .payToContract(contractAddress, {
      inline: Data.to<DatumMain>(contract.datum, DatumMain),
    }, assets)
    .addSigner(await owner.wallet.address())
    .validFrom(validFrom())
    .attachSpendingValidator(validator)
    .complete();

  return await tx.sign().complete();
}

export async function contractClose(
  owner: Lucid,
  contract: Contract,
  debug: boolean,
  force: boolean,
): Promise<TxSigned> {
  const redeemer = getRedeemer(Data.to(new Constr(5, [])), debug, force);
  const validator = await readValidator(debug);
  /*
  const collect: Array<OutRef> = [{
    txHash: contract.utxo.txHash,
    outputIndex: Number(contract.utxo.outputIndex),
  }];

  for (const leaf of contract.database) {
    collect.push({
      txHash: leaf.utxo.txHash,
      outputIndex: Number(leaf.utxo.outputIndex),
    });
  }
  const utxos = await owner.utxosByOutRef(collect);
  */
  const validateUnit: Unit = contract.datum.validate.policyId + contract.datum.validate.name;
  const validateAmount = contract.datum.count + BigInt(validateUnit in contract.utxo.assets ? contract.utxo.assets[validateUnit] : BigInt(0));
  const validatePolicy = await createValidatePolicy(owner, debug);
  //const validatePolicyId = owner.utils.mintingPolicyToId(validatePolicy);

  const utxos = [contract.utxo];
  for (const leaf of contract.database) {
    utxos.push(leaf.utxo);
  }

  console.log(`Burn: ${validateAmount}`);
  console.log(utxos);

  const tx = await owner
    .newTx()
    .collectFrom(utxos, redeemer)
    .mintAssets({ [validateUnit]: -validateAmount }, redeemer)
    .addSigner(await owner.wallet.address())
    .validFrom(validFrom())
    .attachSpendingValidator(validator)
    .attachMintingPolicy(validatePolicy)
    .complete();

  return await tx
    .sign()
    .complete();
}

/**
 * Stake new NFT asset
 * Add new leaf
 * If there is a need, replace previos one
 */
export async function contractAssetAdd(
  contract: Contract,
  lucid: Lucid,
  name: string,
  debug: boolean,
  force: boolean,
): Promise<TxSigned> {
  const redeemer = getRedeemer(Data.to(new Constr(0, [])), debug, force);
  const validator = await readValidator(debug);
  const contractAddress = lucid.utils.validatorToAddress(validator);

  const prev = databaseGetPrev(contract.database, name);
  let next = null;

  if (prev !== null) {
    next = prev.datum.next;
    prev.datum.next = name;
  } else {
    next = contract.datum.first;
    contract.datum.first = name;
  }
  contract.datum.count += BigInt(1);
  const [utxo] = await lucid.utxosByOutRef([{
    txHash: contract.utxo.txHash,
    outputIndex: Number(contract.utxo.outputIndex),
  }]);

  const utxos = [utxo];

  const nftDatumData: DatumLeaf = {
    name,
    hash: hashDatumMain(contract.datum),
    owner: contract.datum.owner,
    staker: await getWalletHash(lucid),
    start: calculateStart(),
    expiration: calculateExpiration(contract.datum),
    amount: contract.datum.reward.amount,
    time: contract.datum.reward.time,
    next,
  };

  const rewardUnit: Unit = contract.datum.reward.policyId +
    contract.datum.reward.name;
  const validateUnit: Unit = contract.datum.validate.policyId +
    contract.datum.validate.name;
  const nftUnit: Unit = contract.datum.policyId + nftDatumData.name;

  console.log(contract.datum);
  console.log(nftDatumData);

  let txBuilder = lucid
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
    const [utxo] = await lucid.utxosByOutRef([{
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
    .payToAddress(await lucid.wallet.address(), {
      [nftUnit]: BigInt(1),
    })
    .addSigner(await lucid.wallet.address())
    .validFrom(validFrom())
    .attachSpendingValidator(validator)
    .complete();

  const signedTx = await tx
    .sign()
    .complete();
  return signedTx;
}

export async function contractAssetPayout(
  contract: Contract,
  leaf: Leaf,
  lucid: Lucid,
  debug: boolean,
  force: boolean,
): Promise<TxSigned> {
  // Redemer for payout must have current timestamp
  const redeemer = getRedeemer(Data.to(new Constr(1, [now])), debug, force);
  const validator = await readValidator(debug);
  const contractAddress = lucid.utils.validatorToAddress(validator);

  const prev = databaseGetPrev(contract.database, leaf.datum.name);

  /*
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
  */

  const utxos = [contract.utxo, leaf.utxo];

  if (prev !== null) {
    prev.datum.next = leaf.datum.next;
    /*query.push({
      txHash: prev.utxo.txHash,
      outputIndex: Number(prev.utxo.outputIndex),
    });*/
    utxos.push(prev.utxo);
  } else {
    contract.datum.first = leaf.datum.next;
  }

  contract.datum.count -= BigInt(1);
  /*const utxo_query = await lucid.utxosByOutRef(query);
  const utxo = utxo_query.find((u) =>
    u.txHash === contract.utxo.txHash &&
    u.outputIndex === Number(contract.utxo.outputIndex)
  )!;
  const leaf = utxo_query.find((u) =>
    u.txHash === current.utxo.txHash &&
    u.outputIndex === Number(current.utxo.outputIndex)
  )!;

  */
  //let leaf_pred = null;


  //const utxos = [utxo, leaf];
  if (prev !== null) {
    /*leaf_pred = utxo_query.find((u) =>
      u.txHash === prev.utxo.txHash &&
      u.outputIndex === Number(prev.utxo.outputIndex)
    )!;
    utxos.push(
      leaf_pred,
    );*/
    utxos.push(prev.utxo);
  }

  const rewardUnit: Unit = contract.datum.reward.policyId +
    contract.datum.reward.name;
  const validateUnit: Unit = contract.datum.validate.policyId +
    contract.datum.validate.name;
  const nftUnit: Unit = contract.datum.policyId + leaf.datum.name;

  const reward = calculateReward(contract.datum, leaf.datum);

  const assets = {
    lovelace: contract.datum.lovelace,
    [rewardUnit]: BigInt(contract.utxo.assets[rewardUnit]) - reward,
    [validateUnit]:
      (validateUnit in contract.utxo.assets ? BigInt(contract.utxo.assets[validateUnit]) : BigInt(0)) +
      BigInt(1),
  };

  console.log(assets);

  let txBuilder = lucid
    .newTx()
    .collectFrom(utxos, redeemer)
    .payToContract(contractAddress, {
      inline: Data.to<DatumMain>(contract.datum, DatumMain),
    }, assets);

  if (prev !== null) {
    txBuilder = txBuilder
      .payToContract(contractAddress, {
        inline: Data.to<DatumLeaf>(prev.datum, DatumLeaf),
      }, prev.utxo.assets);
  }

  console.log(
    `Alive1: ${now} ${now < leaf.datum.expiration
    } ${leaf.datum.expiration}`,
  );

  txBuilder = txBuilder
    .payToAddress(await lucid.wallet.address(), {
      [nftUnit]: BigInt(1),
    })
    .addSigner(await lucid.wallet.address())
    .validFrom(validFrom())
    .attachSpendingValidator(validator);

  console.log(`Alive2: ${nftUnit}`);
  const tx = await txBuilder.complete();

  return await tx
    .sign()
    .complete();
}

export async function contractAssetRenew(
  contract: Contract,
  leaf: Leaf,
  lucid: Lucid,
  debug: boolean,
  force: boolean
): Promise<TxSigned> {
  const redeemer = getRedeemer(Data.to(new Constr(2, [])), debug, force);
  const validator = await readValidator(debug);
  const contractAddress = lucid.utils.validatorToAddress(validator);

  //const current = databaseGet(contract.database, name);

  /*
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
  */

  const utxos = [contract.utxo, leaf.utxo];

  const rewardUnit: Unit = contract.datum.reward.policyId +
    contract.datum.reward.name;
  const validateUnit: Unit = contract.datum.validate.policyId +
    contract.datum.validate.name;
  const nftUnit: Unit = contract.datum.policyId + leaf.datum.name;

  const reward = calculateReward(contract.datum, leaf.datum);
  leaf.datum.start = calculateStart();
  leaf.datum.expiration = calculateExpiration(contract.datum);
  leaf.datum.time = contract.datum.reward.time;
  leaf.datum.amount = contract.datum.reward.amount;

  const tx = await lucid
    .newTx()
    .collectFrom(utxos, redeemer)
    // Attach main contract
    .payToContract(contractAddress, {
      inline: Data.to<DatumMain>(contract.datum, DatumMain),
    }, {
      lovelace: contract.datum.lovelace,
      [rewardUnit]: BigInt(contract.utxo.assets[rewardUnit]) - reward,
      [validateUnit]:
        (validateUnit in contract.utxo.assets ? contract.utxo.assets[validateUnit] : BigInt(0)),
    })
    .payToContract(contractAddress, {
      inline: Data.to<DatumLeaf>(leaf.datum, DatumLeaf),
    }, {
      lovelace: contract.datum.lovelace,
      [validateUnit]: BigInt(1),
    })
    .payToAddress(await lucid.wallet.address(), {
      [nftUnit]: BigInt(1),
    })
    .addSigner(await lucid.wallet.address())
    .validFrom(validFrom())
    .attachSpendingValidator(validator)
    .complete();

  return await tx
    .sign()
    .complete();
}

/**
 * Close by main contract owner
 */
export async function contractAssetClose(
  contract: Contract,
  owner: Lucid,
  name: string,
  debug: boolean,
  force: boolean,
): Promise<TxSigned> {
  const redeemer = getRedeemer(Data.to(new Constr(3, [])), debug, force);
  const validator = await readValidator(debug);
  const contractAddress = owner.utils.validatorToAddress(validator);

  const prev = databaseGetPrev(contract.database, name);
  const current = databaseGet(contract.database, name);

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
      [validateUnit]:
        (validateUnit in utxo.assets ? utxo.assets[validateUnit] : BigInt(0)) +
        BigInt(1),
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

  return await tx
    .sign()
    .complete();
}
