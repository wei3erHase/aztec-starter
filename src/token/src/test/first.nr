use crate::test::utils;

use dep::aztec::{
    protocol_types::storage::map::derive_storage_slot_in_map,
    oracle::{
        execution::get_block_number, 
        storage::storage_read
        }
    };

use crate::TokenVotes;

#[test]
unconstrained fn test_initializer() {

}