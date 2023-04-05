use aiken/list
use aiken/transaction.{ScriptContext}
use aiken/transaction/credential.{Address}
use aiken/transaction/value
use staking/common

pub fn get_input(address: Address, context: ScriptContext) -> transaction.Output {
  when
    list.find(
      context.transaction.inputs,
      fn(i) {
        // Main record is always first record
        i.output_reference.output_index == 0 && i.output.address == address
      },
    )
  is {
    Some(main) ->
      main.output
    None ->
      error @"There is no main transaction input!!!"
  }
}

// Main should be the first output
pub fn get_output(
  address: Address,
  context: ScriptContext,
) -> transaction.Output {
  when context.transaction.outputs is {
    [o, ..] ->
      if o.address == address {
        o
      } else {
        error @"First output is not script address"
      }
    _ ->
      error @"There is no first record!"
  }
}

// Check all record except count and first
pub fn check_datum_no_update(input: common.DatumMain, output: common.DatumMain) {
  list.and(
    [
      input.owner == output.owner,
      input.validate == output.validate,
      input.policy_id == output.policy_id,
      input.expiration == output.expiration,
      input.reward == output.reward,
      input.lovelace == output.lovelace,
    ],
  )
}

pub fn check_asset_add(
  input: transaction.Output,
  input_datum: common.DatumMain,
  output: transaction.Output,
  output_datum: common.DatumMain,
) {
  let validate_of =
    common.validate_of(input_datum)
  let reward_of =
    common.reward_of(input_datum)
  list.and(
    [
      // We add 1 asset to new leaf
      validate_of(input.value) == validate_of(output.value) + 1,
      reward_of(input.value) == reward_of(output.value),
      value.lovelace_of(input.value) == value.lovelace_of(output.value),
      input_datum.count + 1 == output_datum.count,
    ],
  )
}

pub fn check_asset_del(
  input: transaction.Output,
  input_datum: common.DatumMain,
  output: transaction.Output,
  output_datum: common.DatumMain,
) {
  let validate_of =
    common.validate_of(input_datum)
  list.and(
    [
      // We remove 1 asset from new leaf
      validate_of(input.value) + 1 == validate_of(output.value),
      value.lovelace_of(input.value) == value.lovelace_of(output.value),
      input_datum.count == output_datum.count + 1,
    ],
  )
}
