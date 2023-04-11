use aiken/bytearray
use aiken/cbor
use aiken/dict
use aiken/hash.{Blake2b_224, Blake2b_256, Hash}
use aiken/interval.{Finite}
use aiken/list
use aiken/math
use aiken/transaction.{
  Datum, DatumHash, InlineDatum, NoDatum, ScriptContext, Spend, Transaction,
  ValidityRange, find_datum,
}
use aiken/transaction/credential.{Address, ScriptCredential, VerificationKey}
use aiken/transaction/value.{AssetName, PolicyId, quantity_of}

pub type VerificationKeyHash =
  Hash<Blake2b_224, VerificationKey>

pub type POSIXTime =
  Int

pub type Reward {
  policy_id: PolicyId,
  name: AssetName,
  amount: Int,
  time: Int,
  timeout: Int,
}

pub type Validate {
  // Validate token policy
  policy_id: PolicyId,
  name: AssetName,
}

// List of active NFTs
pub type DatumLeaf {
  // Name of the asset
  name: AssetName,
  // policy id of the asset
  hash: Hash<Blake2b_256, ByteArray>,
  // Owner of the main UTxO
  owner: Hash<Blake2b_224, VerificationKey>,
  // Beneficient
  staker: Hash<Blake2b_224, VerificationKey>,
  // Start of staking
  start: POSIXTime,
  // Expiration of staking
  expiration: POSIXTime,
  // Reward time
  time: Int,
  // Reward amount
  amount: Int,
  // Next asset
  next: Option<AssetName>,
}

pub type DatumMain {
  // Address of the owner of the contract
  owner: Hash<Blake2b_224, VerificationKey>,
  // Validate token
  validate: Validate,
  // Policy ID of staking contract
  policy_id: PolicyId,
  // Timeout of the contract
  expiration: POSIXTime,
  // Reward parametres
  reward: Reward,
  // Lovelace to interact with contract
  lovelace: Int,
  // Number of running staking
  count: Int,
  // First NFT to stake
  first: Option<AssetName>,
}

// List of NFTs
// Value: policy ((Time - Start) / reward time) * reward

pub type Redeemer {
  // Add asset to the end of the list
  AssetAdd
  // Repay staked asset
  AssetPayout(POSIXTime)
  // Repay asset and register again
  AssetRenew
  // Close asset - inactive/timeout
  AssetClose
  // Add money and postpone expiration
  Renew(POSIXTime)
  // Close contract after timeout
  Close
  // Test redemmer for collect all
  Collect
}

// Get datum from transaction or error
pub fn get_datum(datum: Datum, context: ScriptContext) -> Data {
  when datum is {
    NoDatum -> error @"No datum provided!!!"
    DatumHash(datum_hash) -> {
      expect Some(data) = find_datum(context.transaction, datum_hash)
      data
    }
    InlineDatum(data) -> data
  }
}

// Cast data to  DatumLeaf
pub fn get_datum_leaf(
  output: transaction.Output,
  context: ScriptContext,
) -> DatumLeaf {
  let datum = get_datum(output.datum, context)
  expect leaf: DatumLeaf = datum

  leaf
}

// Cast data to DatumMain
pub fn get_datum_main(
  output: transaction.Output,
  context: ScriptContext,
) -> DatumMain {
  let datum = get_datum(output.datum, context)
  expect main: DatumMain = datum

  main
}

pub fn hash_datum_main(datum: DatumMain) -> Hash<Blake2b_256, ByteArray> {
  // Hash all relevant unchangable fields
  hash.blake2b_256(
    datum.owner
    |> bytearray.concat(datum.validate.policy_id)
    |> bytearray.concat(datum.validate.name)
    |> bytearray.concat(datum.policy_id)
    |> bytearray.concat(datum.reward.policy_id)
    |> bytearray.concat(datum.reward.name),
  )
}

pub fn check_main_leaf(main: DatumMain, leaf: DatumLeaf) {
  list.and(
    [
      hash_datum_main(main) == leaf.hash,
      main.reward.time == leaf.time,
      main.reward.amount == leaf.amount,
      main.expiration >= leaf.expiration,
    ],
  )
}

pub fn is_expired(range: ValidityRange, expiration: POSIXTime) {
  when range.lower_bound.bound_type is {
    Finite(now) -> now >= expiration
    _ -> False
  }
}

pub fn is_valid(range: ValidityRange, expiration: POSIXTime) {
  when range.lower_bound.bound_type is {
    Finite(now) -> expiration >= now
    _ -> False
  }
}

pub fn must_be_signed_by(transaction: Transaction, vk: VerificationKeyHash) {
  list.has(transaction.extra_signatories, vk)
}

pub fn calculate_reward(datum: DatumLeaf, time: POSIXTime) -> Int {
  ( math.min(time, datum.expiration) - datum.start ) * datum.amount / datum.time
}

pub fn calculate_running_reward(
  input: DatumMain,
  output: DatumMain,
  count: Int,
  time: POSIXTime,
) -> Int {
  let prev =
    input.reward.timeout * input.reward.amount * input.count / input.reward.time
  let current =
    ( output.expiration - time ) * output.reward.amount * (
      input.count + count
    ) / output.reward.time

  prev + current
}

pub fn asset_present(
  context: ScriptContext,
  policy_id: PolicyId,
  name: AssetName,
) {
  list.any(
    context.transaction.inputs,
    fn(i) { quantity_of(i.output.value, policy_id, name) > 0 },
  )
}

pub fn validate_of(datum: DatumMain) {
  quantity_of(_, datum.validate.policy_id, datum.validate.name)
}

pub fn reward_of(datum: DatumMain) {
  quantity_of(_, datum.reward.policy_id, datum.reward.name)
}

pub fn get_address(context: ScriptContext) -> Address {
  expect Spend(output_reference) = context.purpose
  expect Some(input) =
    transaction.find_input(context.transaction, output_reference)
  expect ScriptCredential(_) = input.output.address.payment_credential
  input.output.address
}

pub fn script_input_count(context: ScriptContext) -> Int {
  let address = get_address(context)
  list.length(
    list.filter(
      context.transaction.inputs,
      fn(i) { i.output.address == address },
    ),
  )
}

pub fn script_output_count(context: ScriptContext) -> Int {
  let address = get_address(context)
  list.length(
    list.filter(context.transaction.outputs, fn(o) { o.address == address }),
  )
}

pub fn check_validate_asset(
  context: ScriptContext,
  address: Address,
  policy_id: PolicyId,
  name: AssetName,
) {
  let outputs =
    list.filter(
      context.transaction.outputs,
      fn(o) {
        o.address == address && quantity_of(o.value, policy_id, name) >= 0
      },
    )
  let others =
    context.transaction.outputs
    |> list.filter(fn(o) { o.address != address })
    |> list.all(fn(o) { quantity_of(o.value, policy_id, name) == 0 })

  let scripts = when outputs is {
    [main, ..leves] -> {
      let datum_main = get_datum_main(main, context)
      let datum_main_hash = hash_datum_main(datum_main)
      let datums_leves =
        list.filter_map(leves, fn(leaf) { Some(get_datum_leaf(leaf, context)) })
      list.and(
        [
          datum_main.validate.policy_id == policy_id && datum_main.validate.name == name,
          list.all(
            datums_leves,
            fn(datum_leaf) { datum_main_hash == datum_leaf.hash },
          ),
        ],
      )
    }
    [main] -> {
      let datum_main = get_datum_main(main, context)
      datum_main.validate.policy_id == policy_id && datum_main.validate.name == name
    }
    [] -> True
  }

  others && scripts
}

test redeemer() {
  let r1 = AssetAdd
  let r2 = AssetPayout(123)
  let r3 = AssetRenew
  let r4 = AssetClose
  let r5 = Renew(123)
  let r6 = Close
  let r7 = Collect

  list.and(
    [
      cbor.diagnostic(r1) == @"121([])",
      cbor.diagnostic(r2) == @"122([123])",
      cbor.diagnostic(r3) == @"123([])",
      cbor.diagnostic(r4) == @"124([])",
      cbor.diagnostic(r5) == @"125([123])",
      cbor.diagnostic(r6) == @"126([])",
      cbor.diagnostic(r7) == @"127([])",
    ],
  )
}

test bool() {
  let true = True
  let false = False

  list.and(
    [cbor.diagnostic(true) == @"122([])", cbor.diagnostic(false) == @"121([])"],
  )
}

// Check datums formats

// Check main datum
test test_datum_main() {
  let datum =
    DatumMain {
      owner: #"e5a45f228800cc83854eaba1d2745f8f0c240665e2a9d467e1225648",
      validate: Validate {
        policy_id: #"883698f6cabe9347f8db1b9ae8dab99cafc4285e9e1107fe14feb181",
        name: #"5374616b652056616c696461746f72",
      },
      policy_id: #"883698f6cabe9347f8db1b9ae8dab99cafc4285e9e1107fe14feb181",
      expiration: 1680364053,
      reward: Reward {
        policy_id: #"883698f6cabe9347f8db1b9ae8dab99cafc4285e9e1107fe14feb181",
        name: #"4d696b736120526577617264",
        amount: 1,
        time: 900,
        timeout: 3600,
      },
      lovelace: 3000000,
      count: 2,
      first: Some(#"4170706c65"),
    }
  //cbor.diagnostic(datum) == @"121([h'E5A45F228800CC83854EABA1D2745F8F0C240665E2A9D467E1225648', 121([h'883698F6CABE9347F8DB1B9AE8DAB99CAFC4285E9E1107FE14FEB181', h'5374616B652056616C696461746F72']), h'883698F6CABE9347F8DB1B9AE8DAB99CAFC4285E9E1107FE14FEB181', 1680364053, 121([h'883698F6CABE9347F8DB1B9AE8DAB99CAFC4285E9E1107FE14FEB181', h'4D696B736120526577617264', 1, 900, 3600]), 3000000, 2, 121([h'4170706C65'])])"
  hash.blake2b_256(
    datum.validate.policy_id
    |> bytearray.concat(datum.validate.name)
    |> bytearray.concat(datum.policy_id),
  ) == #"2cc886a3c5cbbed1f85814a244b223f6bdf159399f0439834f4871fdcb991fde"
}

test test_datum_leaf() {
  let datum =
    DatumLeaf {
      name: #"4170706c65",
      hash: #"abcdef",
      owner: #"e5a45f228800cc83854eaba1d2745f8f0c240665e2a9d467e1225648",
      staker: #"dfea8d1793dc6070ff7210ba57981a806d7fe53850f4fafc996b3a7d",
      start: 1679764968,
      expiration: 1679768508,
      time: 900,
      amount: 900,
      next: None,
    }
  cbor.diagnostic(datum) == @"121([h'4170706C65', h'ABCDEF', h'E5A45F228800CC83854EABA1D2745F8F0C240665E2A9D467E1225648', h'DFEA8D1793DC6070FF7210BA57981A806D7FE53850F4FAFC996B3A7D', 1679764968, 1679768508, 900, 900, 122([])])"
}
