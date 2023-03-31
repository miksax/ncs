use aiken/hash.{Blake2b_224, Hash}
use aiken/list
use aiken/math
use aiken/transaction.{Mint, ScriptContext}
use aiken/transaction/credential.{VerificationKey, from_script}
use aiken/transaction/value.{AssetName, lovelace_of}
use staking/common
use staking/leaf
use staking/main

// For minting validation asset
validator(script_hash: ByteArray, name: AssetName) {
  fn asset(_: Data, context: ScriptContext) -> Bool {
    let address =
      from_script(script_hash)
    let ScriptContext { purpose, .. } =
      context
    expect Mint(policy_id) =
      purpose

    common.check_validate_asset(context, address, policy_id, name)
  }
}

// Common minting - reward/NFT - mainly test purpose
validator(owner: Hash<Blake2b_224, VerificationKey>) {
  fn minting(_: Data, context: ScriptContext) -> Bool {
    common.must_be_signed_by(context.transaction, owner)
  }
}

// Missing
// Number of UTxO with script must be validated (to avoid spending tail of the contract)
validator(debug: Bool) {
  fn staking(_: Data, redeemer: common.Redeemer, context: ScriptContext) -> Bool {
    let address =
      common.get_address(context)

    let input =
      main.get_input(address, context)
    let input_datum =
      common.get_datum_main(input, context)

    let check_validity_token_manipulation =
      common.check_validate_asset(
        context,
        address,
        input_datum.validate.policy_id,
        input_datum.validate.name,
      )
    // Check validate asset manipulation
    check_validity_token_manipulation && when redeemer is {
      // Add asset to staking
      common.AssetAdd -> {
        let output =
          main.get_output(address, context)
        let output_datum =
          common.get_datum_main(output, context)
        let leaf_output =
          leaf.get_output(address, context)
        let leaf_output_datum =
          common.get_datum_leaf(leaf_output, context)
        list.and(
          [
            common.is_valid(
              context.transaction.validity_range,
              input_datum.timeout,
            ),
            main.check_datum_no_update(input_datum, output_datum),
            main.check_asset_add(input, input_datum, output, output_datum),
            leaf.check_asset_add(address, input_datum, output_datum, context),
            common.check_main_leaf(input_datum, leaf_output_datum),
          ],
        )
      }
      // Collect reward and renew
      common.AssetRenew -> {
        let output =
          main.get_output(address, context)
        let output_datum =
          common.get_datum_main(output, context)
        let validate_of =
          common.validate_of(input_datum)
        let reward_of =
          common.reward_of(input_datum)
        let input_leaf =
          leaf.get_input(address, context)
        let input_leaf_datum =
          common.get_datum_leaf(input_leaf, context)
        let output_leaf =
          leaf.get_output(address, context)
        let output_leaf_datum =
          common.get_datum_leaf(output_leaf, context)
        list.and(
          [
            validate_of(input.value) <= validate_of(output.value),
            lovelace_of(input.value) <= lovelace_of(output.value),
            reward_of(input.value) <= reward_of(output.value) + common.calculate_reward(
              input_leaf_datum,
              output_leaf_datum.start,
            ),
            common.must_be_signed_by(
              context.transaction,
              input_leaf_datum.beneficient,
            ),
            input_leaf_datum.beneficient == output_leaf_datum.beneficient,
            common.is_valid(
              context.transaction.validity_range,
              input_datum.timeout,
            ),
            common.is_valid(
              context.transaction.validity_range,
              input_leaf_datum.expiration,
            ),
            common.check_main_leaf(input_datum, output_leaf_datum),
            main.check_datum_no_update(input_datum, output_datum),
            input_datum.count == output_datum.count,
            input_datum.first == output_datum.first,
          ],
        )
      }
      // Payout reward and remove from stake
      common.AssetPayout(time) -> {
        let output =
          main.get_output(address, context)
        let output_datum =
          common.get_datum_main(output, context)
        let reward_of =
          common.reward_of(input_datum)
        let input_leaf =
          leaf.get_input(address, context)
        let input_leaf_datum =
          common.get_datum_leaf(input_leaf, context)
        list.and(
          [
            main.check_datum_no_update(input_datum, output_datum),
            reward_of(input.value) <= reward_of(output.value) + common.calculate_reward(
              input_leaf_datum,
              time,
            ),
            common.must_be_signed_by(
              context.transaction,
              input_leaf_datum.beneficient,
            ),
            common.is_valid(
              context.transaction.validity_range,
              input_datum.timeout,
            ),
            common.is_valid(
              context.transaction.validity_range,
              input_leaf_datum.expiration,
            ),
            common.is_expired(context.transaction.validity_range, time),
            main.check_datum_no_update(input_datum, output_datum),
            main.check_asset_del(input, input_datum, output, output_datum),
          ],
        )
      }
      // Close by stake owner - expired
      common.AssetClose -> {
        let output =
          main.get_output(address, context)
        let output_datum =
          common.get_datum_main(output, context)
        let input_leaf =
          leaf.get_input(address, context)
        let input_leaf_datum =
          common.get_datum_leaf(input_leaf, context)
        let reward_of =
          common.reward_of(input_datum)
        list.and(
          [
            common.is_expired(
              context.transaction.validity_range,
              input_leaf_datum.expiration,
            ),
            common.must_be_signed_by(context.transaction, input_datum.owner),
            reward_of(input.value) <= reward_of(output.value),
            main.check_datum_no_update(input_datum, output_datum),
            main.check_asset_del(input, input_datum, output, output_datum),
          ],
        )
      }
      // Renew stake contract by owner
      common.Renew(time) -> {
        let output =
          main.get_output(address, context)
        let output_datum =
          common.get_datum_main(output, context)
        let validate_of =
          common.validate_of(input_datum)
        let reward_of =
          common.reward_of(input_datum)
        list.and(
          [
            input_datum.timeout < output_datum.timeout,
            input_datum.validate == output_datum.validate,
            input_datum.policy_id == output_datum.policy_id,
            input_datum.reward.policy_id == output_datum.reward.policy_id,
            input_datum.reward.name == output_datum.reward.name,
            lovelace_of(output.value) >= output_datum.lovelace,
            reward_of(input.value) >= math.max(
              reward_of(output.value),
              common.calculate_running_reward(
                input_datum,
                output_datum,
                validate_of(output.value),
                time,
              ),
            ),
            common.is_valid(
              context.transaction.validity_range,
              input_datum.timeout,
            ),
            common.must_be_signed_by(context.transaction, input_datum.owner),
          ],
        )
      }
      // Close contract and collect all assets
      common.Close ->
        list.and(
          [
            common.is_expired(
              context.transaction.validity_range,
              input_datum.timeout,
            ),
            common.must_be_signed_by(context.transaction, input_datum.owner),
            when context.purpose is {
              transaction.Spend(output_reference) ->
                if output_reference.output_index > 0 {
                  expect Some(utxo) =
                    transaction.find_input(
                      context.transaction,
                      output_reference,
                    )
                  let datum =
                    common.get_datum_leaf(utxo.output, context)
                  list.and(
                    [
                      common.check_main_leaf(input_datum, datum),
                      common.must_be_signed_by(context.transaction, datum.owner),
                      common.is_expired(
                        context.transaction.validity_range,
                        datum.expiration,
                      ),
                    ],
                  )
                } else {
                  expect Some(utxo) =
                    transaction.find_input(
                      context.transaction,
                      output_reference,
                    )
                  let datum =
                    common.get_datum_main(utxo.output, context)
                  datum == input_datum
                }
              _ ->
                False
            },
          ],
        )
      // Testing redeemer for cleaning up code
      common.Collect ->
        debug
    }
  }
}
