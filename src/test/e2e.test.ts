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
  let sharedNoteContract: NoteSharingContract;
  
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
  
        sharedNoteContract = sharedNoteReceipt.contract;
    }, 200_000);

    describe("create_and_share_note(...)", () => {
        let shared_key_nullifier_alice: Fr;
        let shared_key_nullifier_bob: Fr;
        let sharedNotes: ExtendedNote[];
        let sharedOutNotes: ExtendedNote[];

        it("should not revert", async () => {
            const txReceipt = await sharedNoteContract
            .withWallet(alice)
            .methods.create_and_share_note(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;
            console.log("sharedNotes", sharedNotes);

            sharedOutNotes = txReceipt.debugInfo?.visibleOutgoingNotes!
            console.log("sharedOutNotes", sharedOutNotes);
            // NOTE: sharedOutNotes declare an owner that isn't nor Alice nor Bob

            let nullifiers = txReceipt.debugInfo?.nullifiers!;
            console.log("nullifiers", nullifiers);

            expect(txReceipt.status).toBe("success");
        })
        
        it("should create two notes", async () => {
            expect(sharedNotes.length).toBe(2);
        })

        it("should create a note for alice with the correct parameters", async () => {
            const aliceParam = sharedNotes[0].note.items[0];
            const bobParam = sharedNotes[0].note.items[1];
            const noteOwner = sharedNotes[0].owner;

            console.log('Alice note: ', sharedNotes[0].note);

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
            // NOTE: passes bc both nullifiers are the null (not computed)
            expect(shared_key_nullifier_alice).toEqual(
                shared_key_nullifier_bob
            );
        });
        
        it("should revert if the note already exists", async () => {
            const txReceipt = sharedNoteContract
            .withWallet(alice)
            .methods.create_and_share_note(bob.getAddress())
            .simulate();

            await expect(txReceipt).rejects.toThrow(
                new RegExp("Note already exists")
            );
        })
    })

    describe("bob_action", () => {
        let sharedNotes: ExtendedNote[]; 
        let nullifiers: Fr[];

        it("should revert if the note doesnt exist", async () => {
            const txReceipt = sharedNoteContract
            .withWallet(bob)
            .methods.bob_action(randomAccount.getAddress())
            .simulate();

            await expect(txReceipt).rejects.toThrow(
                new RegExp("Note not found")
            );
        })

        it("should not revert", async () => {
            const txReceipt = await sharedNoteContract
            .withWallet(bob)
            .methods.bob_action(
                alice.getAddress(),
            )
            .send()
            .wait({debug: true});

            sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;
            nullifiers = txReceipt.debugInfo?.nullifiers!;

            expect(txReceipt.status).toBe("success");        
        })

        it("should nullify the note", async () => {
           expect(sharedNotes.length).toBe(0);
           expect(nullifiers.length).toBe(2); // TODO: why 2???
        })
    })

    describe("alice_action", () => {
        let sharedNotes: ExtendedNote[]; 
        let sharedNotesAfterNullification: ExtendedNote[];

        beforeAll(async () => {
            // NOTE: redeploying to ignore previous notes and nullifiers
            const sharedNoteReceipt = await NoteSharingContract.deploy(deployer)
              .send()
              .wait();
        
            sharedNoteContract = sharedNoteReceipt.contract;

            // Because we nullified the note in the previous test, we need to create a new one.
            // NOTE: fails w/o redeploy, didn't nullify Alice's note
            const txReceipt = await sharedNoteContract
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
            const txReceipt = sharedNoteContract
            .withWallet(alice)
            .methods.alice_action(randomAccount.getAddress())
            .simulate();

            await expect(txReceipt).rejects.toThrow(
                new RegExp("Note not found")
            );
        })

        it("should not revert", async () => {
            const txReceipt = await sharedNoteContract
            .withWallet(alice)
            .methods.alice_action(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            sharedNotesAfterNullification = txReceipt.debugInfo?.visibleIncomingNotes!;

            expect(txReceipt.status).toBe("success");  
        })

        it("should nullify the note", async () => {
            expect(sharedNotesAfterNullification.length).toBe(0);
        })
    })
  });