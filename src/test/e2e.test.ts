import {
    AccountWalletWithSecretKey,
    createPXEClient,
    ExtendedNote,
    Fr,
    PXE,
    waitForPXE,
  } from "@aztec/aztec.js";
  
  import { NoteSharingContract } from "../artifacts/NoteSharing.ts";
  import { createAccount, deployInitialTestAccounts, getInitialTestAccountsWallets } from "@aztec/accounts/testing";
  
  // Global variables
  let pxe: PXE;
  let sharedNote: NoteSharingContract;
  
  let alice: AccountWalletWithSecretKey;
  let bob: AccountWalletWithSecretKey;
  let deployer: AccountWalletWithSecretKey;
  let randomAccount: AccountWalletWithSecretKey;
  
  const { PXE_URL = 'http://localhost:8080' } = process.env;
  
  const setupSandbox = async () => {
    const pxe = createPXEClient(PXE_URL);
    await waitForPXE(pxe);
    return pxe;
  };
  
  // Setup: Set the sandbox
  beforeAll(async () => {
    pxe = await setupSandbox();
    // await deployInitialTestAccounts(pxe); // NOTE: deploy accounts only once
    [alice, bob, deployer] = await getInitialTestAccountsWallets(pxe);
    console.log("Alice", alice.getAddress());
    console.log("Bob", bob.getAddress());
    
    randomAccount = await createAccount(pxe);

    }, 120_000);

  
  describe("E2E Shared Note", () => {
    beforeAll(async () => {
      const sharedNoteReceipt = await NoteSharingContract.deploy(deployer)
        .send()
        .wait();
  
      sharedNote = sharedNoteReceipt.contract;
    }, 200_000);

    describe.only("create_and_share_note(...)", () => {
        let shared_key_nullifier_alice: Fr;
        let shared_key_nullifier_bob: Fr;
        let sharedNotes: ExtendedNote[]; 

        it("should not revert", async () => {
            const txReceipt = await sharedNote
            .withWallet(alice)
            .methods.create_and_share_note(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;

            let nullifiers = txReceipt.debugInfo?.nullifiers!;
            console.log("nullifiers", nullifiers);

            expect(txReceipt.status).toBe("success");
        })
        
        it("should create two notes", async () => {
            const txReceipt = await sharedNote
            .withWallet(alice)
            .methods.create_and_share_note(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            const sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;
            console.log({sharedNotes});

            expect(sharedNotes.length).toBe(2);
        })

        it("should create a note for alice with the correct parameters", async () => {
            const aliceParam = sharedNotes[0].note.items[0];
            const bobParam = sharedNotes[0].note.items[1];
            const noteOwner = sharedNotes[0].owner;

            console.log(sharedNotes[0].note);

            const aliceAddress = alice.getAddress();
            const bobAddress = bob.getAddress();

            expect(aliceParam).toEqual(aliceAddress);
            expect(bobParam).toEqual(bobAddress);
            expect(noteOwner).toEqual(aliceAddress);
            
            shared_key_nullifier_alice = sharedNotes[0].note.items[2];
        })
        
        it("should create a note for bob with the correct parameters", async () => {
            const aliceParam = sharedNotes[1].note.items[0];
            const bobParam = sharedNotes[1].note.items[1];
            const noteOwner = sharedNotes[1].owner;

            const aliceAddress = alice.getAddress();
            const bobAddress = bob.getAddress();

            expect(aliceParam).toEqual(aliceAddress);
            expect(bobParam).toEqual(bobAddress);
            expect(noteOwner).toEqual(bobAddress);

            shared_key_nullifier_bob = sharedNotes[1].note.items[2];
        })

        it("nullifier key is the same between the 2 notes", async () => {
            expect(shared_key_nullifier_alice).toEqual(
                shared_key_nullifier_bob
            );
        });
        
        it("should revert if the note already exists", async () => {
            const txReceipt = sharedNote
            .withWallet(alice)
            .methods.create_and_share_note(bob.getAddress())
            .simulate();

            await expect(txReceipt).rejects.toThrow(
                "(JSON-RPC PROPAGATED) Assertion failed: Note already exists 'shared_note.is_none()'"
            );
        })
    })

    describe("bob_action", () => {
        let sharedNotes: ExtendedNote[]; 

        it("should revert if the note doesnt exist", async () => {
            const txReceipt = sharedNote
            .withWallet(bob)
            .methods.bob_action(randomAccount.getAddress())
            .simulate();

            await expect(txReceipt).rejects.toThrow(
                "(JSON-RPC PROPAGATED) Assertion failed: Note doesnt exist '!shared_note.is_none()'"
            );
        })

        it("should not revert", async () => {
            const txReceipt = await sharedNote
            .withWallet(bob)
            .methods.bob_action(
                alice.getAddress(),
            )
            .send()
            .wait({debug: true});

            sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;

            expect(txReceipt.status).toBe("mined");        
        })

        it("should nullify the note", async () => {
           expect(sharedNotes.length).toBe(0);
        })
    })

    describe("alice_action", () => {
        let sharedNotes: ExtendedNote[]; 
        let sharedNotesAfterNullification: ExtendedNote[];

        beforeAll(async () => {
            // Because we nullified the note in the previous test, we need to create a new one.
            const txReceipt = await sharedNote
            .withWallet(alice)
            .methods.create_and_share_note(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;
        }, 200_000);

        it("should have existing notes", async () => {
            expect(sharedNotes.length).toBe(2);
        })

        it("should revert if the note doesnt exist", async () => {
            const txReceipt = sharedNote
            .withWallet(alice)
            .methods.alice_action(randomAccount.getAddress())
            .simulate();

            await expect(txReceipt).rejects.toThrow(
                "(JSON-RPC PROPAGATED) Assertion failed: Note doesnt exist '!shared_note.is_none()'"
            );
        })

        it("should not revert", async () => {
            const txReceipt = await sharedNote
            .withWallet(alice)
            .methods.alice_action(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            sharedNotesAfterNullification = txReceipt.debugInfo?.visibleIncomingNotes!;

            expect(txReceipt.status).toBe("mined");  
        })

        it("should nullify the note", async () => {
            expect(sharedNotesAfterNullification.length).toBe(0);
        })
    })
  });