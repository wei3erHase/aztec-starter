mod types;
use dep::aztec::macros::aztec;

#[aztec]
contract NoteSharing {
    
    use crate::types::shared_note:: {SharedNote, SHARED_NOTE_LEN};

    use dep::aztec::{
        keys::getters::get_public_keys,
        macros::{functions::{
            initializer,
            internal, 
            private, 
            public}, 
        storage::storage},
        encrypted_logs::encrypted_note_emission::encode_and_encrypt_note,
        oracle::random::random,
        utils::comparison::Comparator
    };
    use dep::aztec::prelude::{AztecAddress, PrivateSet, NoteGetterOptions};
    
/*
    Note sharing pattern
    =====================
    This file showcases the note sharing pattern. The pattern is as isolated from protocol-specific logic as possible.
    Refer to the README.md for a description of the note sharing pattern as well as links to real code where the pattern is implemented.

    The main thing to take away from this pattern is that it allows for coordination between parties that don't know each other. 
    Some examples of what this pattern can accomplish:

    1) Sharing a note with a shared nullifier key allows any of the parties to nullify the note. Which is a way to trust another party to call a function that performs some action and nullifies the note. 
       An example would be a game where Alice and Bob play against each other. Alice can share a note with Bob indicating the start of the game, and any of the two can nullify it at any time to stop it.

    2) If Alice needs something, and Bob can provide it, she can share a note with Bob, constituting an agreement. Because the note is shared, Alice can cancel the note if Bob doesn't provide what she needs 
       or if she changes her mind before Bob provides it. Bob, in turn, can forbid Alice from cancelling the note if he has already provided what she needed.
*/

    // Declaring the slots for the notes
    global SHARED_NOTE_SLOT = 1;

    // Declaring storage
    #[storage]
    struct Storage<Context> {
        shared_notes: PrivateSet<SharedNote, Context>,
    }

    #[initializer]
    #[private]
    fn initialize() {
    }

    /// @notice Shares a note with another user.
    /// @param  Bob The address to share the note with.
    #[private]
    fn create_and_share_note(bob: AztecAddress) {
        // Store the sender as Alice for readability.
        let alice = context.msg_sender();

        let private_values = storage.shared_notes;
        let mut options = NoteGetterOptions::new();
        options = options
            .select(SharedNote::properties().alice, Comparator.EQ, alice)
            .select(SharedNote::properties().bob, Comparator.EQ, bob)
            .set_limit(1);

        let notes = private_values.get_notes(options);
        // assert(notes.len() == 0, "Note already exists");

        let random_field = random();

        let mut shared_note = SharedNote::new(alice, bob, random_field);
        
        let alice_ovpk_m = get_public_keys(alice).ovpk_m;

        storage.shared_notes.insert(&mut shared_note).emit(encode_and_encrypt_note(
            &mut context,
            alice_ovpk_m,
            alice,
            alice
        ));

        shared_note.shared_nullifier_key += 1;

        storage.shared_notes.insert(&mut shared_note).emit(encode_and_encrypt_note(
            &mut context,
            alice_ovpk_m,
            bob,
            alice
        ));

        // assert(false, "re-built");
        
    }

    /// @notice Executes the action of the user we shared the note with. This will nullify the note at the end.
    /// @param  alice the address of the user who shared the note, used to find the note in storage.
    #[private]
    fn bob_action(alice: AztecAddress) {
        // Set Bob as the sender for readability. This also acts as an implicit check that the caller is Bob. Otherwise, the note won't be found.
        let bob = context.msg_sender();

        let private_values = storage.shared_notes;
        let mut options = NoteGetterOptions::new();
        options = options
            .select(SharedNote::properties().alice, Comparator.EQ, alice)
            .select(SharedNote::properties().bob, Comparator.EQ, bob)
            .set_limit(1);

        let notes = private_values.get_notes(options);
        assert(notes.len() == 1, "Note not found");

        /* 
            Here Bob would perform a piece of logic, like updating state or creating a new note, or executing a callback.
            To showcase the pattern as isolated as possible, we exclude this logic from the example.
        */ 

        // Now that Bob action took place, we nullify the note.
        let popped_notes = storage.shared_notes.pop_notes(options);
        assert(popped_notes.len() == 1, "Note not removed");
    }

    /// @notice Executes the action of the user who shared the note. This will nullify the note at the end.
    /// @param  alice the address of the user who alice shared the note with, used to find the note in storage.
    #[private]
    fn alice_action(bob: AztecAddress) {
        // Set Alice as the sender for readability. This also acts as an implicit check that the caller is Alice. Otherwise, the note won't be found.
        let alice = context.msg_sender();

        let private_values = storage.shared_notes;
        let mut options = NoteGetterOptions::new();
        options = options
            .select(SharedNote::properties().alice, Comparator.EQ, alice)
            .select(SharedNote::properties().bob, Comparator.EQ, bob)
            .set_limit(1);

        let notes = private_values.get_notes(options);
        assert(notes.len() == 1, "Note not found");

        // We assume in this case Alice action was to nullify the shared note to cancel her agreement with Bob.
        let popped_notes = storage.shared_notes.pop_notes(options);
        assert(popped_notes.len() == 1, "Note not removed");
    }

    // ///@notice Computes note hash and nullifier.
    // // unconstrained fn compute_note_hash_and_nullifier(contract_address: AztecAddress, nonce: Field, storage_slot: Field, preimage: [Field; SHARED_NOTE_LEN]) -> pub [Field; 4] {
    // //     let note_header = NoteHeader::new(contract_address, nonce, storage_slot);
    // //     note_utils::compute_note_hash_and_nullifier(SharedNoteMethods, note_header, preimage)
    // // }
}

