mod test;
use dep::aztec::macros::aztec;

#[aztec]
contract TokenVotes {
    use dep::aztec::{
        macros::functions::{initializer, public},
    };

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
