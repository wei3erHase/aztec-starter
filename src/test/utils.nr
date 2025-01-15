use dep::aztec::{
    note::{note_getter::{MAX_NOTES_PER_PAGE, view_notes}, note_viewer_options::NoteViewerOptions},
    prelude::AztecAddress,
    protocol_types::storage::map::derive_storage_slot_in_map,
    test::helpers::test_environment::TestEnvironment,
};
use dep::token::Token;

use crate::EasyPrivateVoting;

pub fn setup() -> (&mut TestEnvironment, AztecAddress, AztecAddress, AztecAddress) {
    let mut env = unsafe { TestEnvironment::new() };

    let admin = unsafe { env.create_account() };

    let token = env.deploy_self("Token").with_public_void_initializer(
            Token::interface().constructor(
                admin, 
                "NAME___________________________", // NOTE: expects str<31>
                "SYMBOL_________________________", 
                18 as u8
                )
        );

    let initializer_call_interface = EasyPrivateVoting::interface().constructor(admin, token.to_address());
    let voting_contract = env.deploy_self("EasyPrivateVoting").with_public_void_initializer(
        initializer_call_interface,
    );
    // std::println(voting_contract);
    (&mut env, voting_contract.to_address(), token.to_address(), admin)
}
