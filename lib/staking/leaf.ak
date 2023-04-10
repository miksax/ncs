use aiken/bytearray
use aiken/list
use aiken/transaction.{ScriptContext}
use aiken/transaction/credential.{Address}
use aiken/transaction/value.{lovelace_of, quantity_of}
use staking/common

pub type Leafs {
  current: transaction.Output,
  current_datum: common.DatumLeaf,
  pred: transaction.Output,
  pred_datum: common.DatumLeaf,
}

pub fn get_inputs(
  address: Address,
  context: ScriptContext,
) -> List<transaction.Output> {
  list.filter_map(
    context.transaction.inputs,
    fn(i) {
      if i.output_reference.output_index > 0 && i.output.address == address {
        Some(i.output)
      } else {
        None
      }
    },
  )
}

// If we know, that there is only single input
pub fn get_input(address: Address, context: ScriptContext) -> transaction.Output {
  let inputs =
    get_inputs(address, context)
  when inputs is {
    [o, ..] ->
      o
    _ ->
      error @"There is no leaf in transaction!!!"
  }
}

pub fn get_outputs(
  address: Address,
  context: ScriptContext,
) -> List<transaction.Output> {
  when context.transaction.outputs is {
    [_, ..xs] ->
      list.filter(xs, fn(o) { o.address == address })
    _ ->
      error @"There is no more records!"
  }
}

// Main should be the first output
pub fn get_output(
  address: Address,
  context: ScriptContext,
) -> transaction.Output {
  let outputs =
    get_outputs(address, context)
  when outputs is {
    [o, ..] ->
      o
    _ ->
      error @"There is no leaf in transaction!!!"
  }
}

pub fn get_leaves(
  leafs: List<transaction.Output>,
  context: ScriptContext,
) -> Leafs {
  when leafs is {
    [current, pred] -> {
      let current_datum =
        common.get_datum_leaf(current, context)
      let pred_datum =
        common.get_datum_leaf(pred, context)
      if pred_datum.next == Some(current_datum.name) {
        Leafs { pred, pred_datum, current, current_datum }
      } else if current_datum.next == Some(pred_datum.name) {
        Leafs {
          pred: current,
          pred_datum: current_datum,
          current: pred,
          current_datum: pred_datum,
        }
      } else {
        error @"unlinked leaves"
      }
    }
    _ ->
      error @"invalid number of leaves"
  }
}

// Check all except next
pub fn check_pred_datum(
  input: transaction.Output,
  input_datum: common.DatumLeaf,
  output: transaction.Output,
  output_datum: common.DatumLeaf,
) {
  list.and(
    [
      input_datum.name == output_datum.name,
      input_datum.hash == output_datum.hash,
      input_datum.owner == output_datum.owner,
      input_datum.staker == output_datum.staker,
      input_datum.start == output_datum.start,
      input_datum.expiration == output_datum.expiration,
      input_datum.time == output_datum.time,
      input_datum.amount == output_datum.amount,
      // No changes with asset
      input.value == output.value,
    ],
  )
}

pub fn check_asset_value(
  main_datum: common.DatumMain,
  output: transaction.Output,
) {
  list.and(
    [
      lovelace_of(output.value) >= main_datum.lovelace,
      quantity_of(
        output.value,
        main_datum.validate.policy_id,
        main_datum.validate.name,
      ) == 1,
    ],
  )
}

pub fn check_asset_add_first(
  address: Address,
  main_input_datum: common.DatumMain,
  main_output_datum: common.DatumMain,
  context: ScriptContext,
) {
  let output =
    get_output(address, context)
  let output_datum =
    common.get_datum_leaf(output, context)

  list.and(
    [
      check_asset_value(main_input_datum, output),
      common.must_be_signed_by(context.transaction, output_datum.staker),
      when main_input_datum.first is {
        // Some previose record
        Some(first) ->
          list.and(
            [
              // Order is important
              bytearray.compare(output_datum.name, first) == Less,
              main_output_datum.first == Some(output_datum.name),
              output_datum.next == main_input_datum.first,
            ],
          )
        // No previouse record
        None ->
          list.and(
            [
              main_output_datum.first == Some(output_datum.name),
              output_datum.next == None,
            ],
          )
      },
    ],
  )
}

pub fn check_asset_add_regular(
  input_datum_main: common.DatumMain,
  address: Address,
  context: ScriptContext,
) {
  let input =
    get_input(address, context)
  let input_datum =
    common.get_datum_leaf(input, context)
  let outputs =
    get_leaves(get_outputs(address, context), context)

  list.and(
    [
      bytearray.compare(input_datum.name, outputs.current_datum.name) == Less,
      bytearray.compare(outputs.pred_datum.name, outputs.current_datum.name) == Less,
      outputs.pred_datum.next == Some(outputs.current_datum.name),
      outputs.current_datum.next == input_datum.next,
      common.must_be_signed_by(
        context.transaction,
        outputs.current_datum.staker,
      ),
      common.asset_present(
        context,
        input_datum_main.policy_id,
        outputs.current_datum.name,
      ),
      check_pred_datum(input, input_datum, outputs.pred, outputs.pred_datum),
    ],
  )
}

pub fn check_asset_add(
  address: Address,
  input_datum: common.DatumMain,
  output_datum: common.DatumMain,
  context: ScriptContext,
) {
  if input_datum.first != output_datum.first {
    check_asset_add_first(address, input_datum, output_datum, context)
  } else {
    check_asset_add_regular(input_datum, address, context)
  }
}
