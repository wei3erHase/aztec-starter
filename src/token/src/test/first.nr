use crate::test::utils;

use dep::aztec::{
    protocol_types::storage::map::derive_storage_slot_in_map,
    oracle::{
        execution::get_block_number, 
        storage::storage_read
        },
    prelude::{AztecAddress},
    };

use crate::TokenVotes;

#[test]
unconstrained fn test_initializer() {
    let (_, token_contract_address, admin) = utils::setup();
}

#[test]
unconstrained fn test_mint_tokens() {
    let (env, token_contract_address, _) = utils::setup();
    
    let amount: U128 = U128::from_integer(100);
    let user = unsafe { env.create_account() };
    env.impersonate(user);

    TokenVotes::at(token_contract_address).mint_tokens(amount).call(&mut env.public());

    let block_number = get_block_number();
    let public_balances_slot = TokenVotes::storage_layout().public_balances.slot;
    let user_public_balances_slot = derive_storage_slot_in_map(public_balances_slot, user);
    let public_balance = storage_read(token_contract_address, user_public_balances_slot, block_number);

    assert(public_balance == amount, "Public balance should be 100");
}

#[test]
unconstrained fn test_minted_tokens_add_votes() {
    let (env, token_contract_address, _) = utils::setup();
    
    let amount: U128 = U128::from_integer(100);
    let user = unsafe { env.create_account() };
    env.impersonate(user);

    TokenVotes::at(token_contract_address).mint_tokens(amount).call(&mut env.public());

    let voting_points = TokenVotes::at(token_contract_address).get_voting_points(user).view(&mut env.public());

    assert(voting_points == amount, "Voting points should be 100");
}

#[test]
unconstrained fn test_delegated_token_votes() {
    let (env, token_contract_address, _) = utils::setup();
    
    let amount: U128 = U128::from_integer(100);
    let delegator = unsafe { env.create_account() };
    let delegatee = AztecAddress::from_field(420);

    env.impersonate(delegator);
    TokenVotes::at(token_contract_address).mint_tokens(amount).call(&mut env.public());
    TokenVotes::at(token_contract_address).delegate_tokens(delegatee).call(&mut env.public());

    let mut voting_points = TokenVotes::at(token_contract_address).get_voting_points(delegator).view(&mut env.public());
    assert(voting_points == U128::zero(), "Voting points of delegator should be 0");

    voting_points = TokenVotes::at(token_contract_address).get_voting_points(delegatee).view(&mut env.public());
    assert(voting_points == amount, "Voting points of delegatee should be 100");
}

#[test]
unconstrained fn test_delegated_token_twice() {
    let (env, token_contract_address, _) = utils::setup();
    
    let amount: U128 = U128::from_integer(100);
    let delegator = unsafe { env.create_account() };
    let delegatee = AztecAddress::from_field(420);
    let other_delegatee = AztecAddress::from_field(42069);

    env.impersonate(delegator);
    TokenVotes::at(token_contract_address).mint_tokens(amount).call(&mut env.public());
    TokenVotes::at(token_contract_address).delegate_tokens(delegatee).call(&mut env.public());

    let mut voting_points = TokenVotes::at(token_contract_address).get_voting_points(delegator).view(&mut env.public());
    assert(voting_points == U128::zero(), "Voting points of delegator should be 0");

    voting_points = TokenVotes::at(token_contract_address).get_voting_points(delegatee).view(&mut env.public());
    assert(voting_points == amount, "Voting points of delegatee should be 100");

    // Delegate again
    TokenVotes::at(token_contract_address).delegate_tokens(other_delegatee).call(&mut env.public());
    
    voting_points = TokenVotes::at(token_contract_address).get_voting_points(delegatee).view(&mut env.public());
    assert(voting_points == U128::zero(), "Voting points of delegatee should be 0");

    voting_points = TokenVotes::at(token_contract_address).get_voting_points(other_delegatee).view(&mut env.public());
    assert(voting_points == amount, "Voting points of other delegatee should be 100");

}