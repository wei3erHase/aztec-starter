mod test;
use dep::aztec::macros::aztec;

#[aztec]
contract TokenVotes {
    use dep::aztec::{
        macros::{
            functions::{initializer, public, view}, 
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
        public_delegatees: Map<AztecAddress, PublicMutable<AztecAddress, Context>, Context>,
        public_delegations: Map<AztecAddress, PublicMutable<U128, Context>, Context>,
        balances: Map<AztecAddress, BalanceSet<Context>, Context>,
        delegations: Map<AztecAddress, DelegatedBalanceSet<Context>, Context>,
    }

    #[public]
    #[initializer]
    fn constructor() {
        // constructor code
    }

    #[public]
    fn mint_tokens(amount: U128) {
        let from = context.msg_sender();
        let current_balance = storage.public_balances.at(from).read();
        storage.public_balances.at(from).write(current_balance + amount);
    }

    #[public]
    fn delegate_tokens(delegatee: AztecAddress) {
        let from = context.msg_sender();
        let current_balance = storage.public_balances.at(from).read();

        // remove the current delegation
        let current_delegatee = storage.public_delegatees.at(from).read();
        let mut current_delegations = storage.public_delegations.at(current_delegatee).read();
        storage.public_delegations.at(current_delegatee).write(current_delegations - current_balance);

        // update the new delegation
        current_delegations = storage.public_delegations.at(delegatee).read();
        storage.public_delegations.at(delegatee).write(current_delegations + current_balance);

        /*
            NOTE:
            - add timestamp / snapshot of the current balance
            - amount of delegation at a previous timestamp should be fetchable
        */
    }

    #[public]
    #[view]
    fn get_voting_points(from: AztecAddress) -> U128 {
        let mut voting_points: U128 = U128::from_integer(0);
        if (storage.public_delegatees.at(from).read() == AztecAddress::zero()) {
            voting_points = storage.public_balances.at(from).read();
        }

        voting_points += storage.public_delegations.at(from).read();

        voting_points
    }
}
