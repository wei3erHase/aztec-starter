mod test;
use dep::aztec::macros::aztec;

#[aztec]
contract TokenVotes {
    use dep::aztec::{
        macros::{
            functions::{initializer, public}, 
            storage::storage, 
            notes::note
            },
        prelude::{AztecAddress, Map, PrivateSet, PublicMutable, NullifiableNote, PrivateContext},
        // keys::getters::{get_nsk_app, get_public_keys},
        // note::utils::compute_note_hash_for_nullify,
        // protocol_types::{
        //     constants::GENERATOR_INDEX__NOTE_NULLIFIER,
        //     hash::poseidon2_hash_with_separator,
        // },
    };

    use dep::uint_note::uint_note::UintNote;

    // TODO: why BalanceSet is needed?
    pub struct BalanceSet<Context> {
        pub set: PrivateSet<UintNote, Context>,
    }

    impl<Context> BalanceSet<Context> {
        pub fn new(context: Context, storage_slot: Field) -> Self {
            assert(storage_slot != 0, "Storage slot 0 not allowed. Storage slots must start from 1.");
            Self { set: PrivateSet::new(context, storage_slot) }
        }
    }

    #[note]
    pub struct DelegatedBalanceNote {
        balance_note_nullifier: Field, // contains randomness
        delegatee: AztecAddress,
        delegated_value: U128,
    }

    impl NullifiableNote for DelegatedBalanceNote {
        // docs:start:nullifier
        fn compute_nullifier(
            self,
            context: &mut PrivateContext,
            note_hash_for_nullify: Field,
        ) -> Field {
            0
            // let owner_npk_m_hash = get_public_keys(self.owner).npk_m.hash();
            // let secret = context.request_nsk_app(owner_npk_m_hash);
            // poseidon2_hash_with_separator(
            //     [note_hash_for_nullify, secret],
            //     GENERATOR_INDEX__NOTE_NULLIFIER as Field,
            // )
        }
        // docs:end:nullifier

        unconstrained fn compute_nullifier_without_context(self) -> Field {
            0
            // let note_hash_for_nullify = compute_note_hash_for_nullify(self);
            // let owner_npk_m_hash = get_public_keys(self.owner).npk_m.hash();
            // let secret = get_nsk_app(owner_npk_m_hash);
            // poseidon2_hash_with_separator(
            //     [note_hash_for_nullify, secret],
            //     GENERATOR_INDEX__NOTE_NULLIFIER,
            // )
        }
    }

    pub struct DelegatedBalanceSet<Context> {
        set: PrivateSet<DelegatedBalanceNote, Context>,
    }

    impl<Context> DelegatedBalanceSet<Context> {
        pub fn new(context: Context, storage_slot: Field) -> Self {
            assert(storage_slot != 0, "Storage slot 0 not allowed. Storage slots must start from 1.");
            Self { set: PrivateSet::new(context, storage_slot) }
        }
    }

    #[storage]
    struct Storage<Context> {
        public_balances: Map<AztecAddress, PublicMutable<U128, Context>, Context>,
        public_delegations: Map<AztecAddress, PublicMutable<AztecAddress, Context>, Context>,
        balances: Map<AztecAddress, BalanceSet<Context>, Context>,
        delegations: Map<AztecAddress, DelegatedBalanceSet<Context>, Context>,
    }

    #[public]
    #[initializer]
    // annotation to mark function as a constructor
    fn constructor() {
        // constructor code
    }

    #[public]
    fn some_public_method() {
        // NOTE: codegen fails if there is none?
    }
}
