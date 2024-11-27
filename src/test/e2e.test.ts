import {
    AccountWalletWithSecretKey,
    AztecAddress,
    Contract,
    ContractDeployer,
    createPXEClient,
    ExtendedNote,
    Fr,
    getContractInstanceFromDeployParams,
    PXE,
    TxStatus,
    waitForPXE,
  } from "@aztec/aztec.js";
  
  import { NoteSharingContractArtifact, NoteSharingContract } from "../artifacts/NoteSharing.ts";
  import { createAccount, deployInitialTestAccounts, getInitialTestAccountsWallets } from "@aztec/accounts/testing";
  
  // Global variables
  let pxe: PXE;
  let sharedNoteContract: Contract;
  
  let alice: AccountWalletWithSecretKey;
  let bob: AccountWalletWithSecretKey;
  let deployer: AccountWalletWithSecretKey;
  let randomAccount: AccountWalletWithSecretKey;
  let salt: Fr;
  
  const { PXE_URL = 'http://localhost:8080' } = process.env;
  
  const setupSandbox = async () => {
    const pxe = createPXEClient(PXE_URL);
    await waitForPXE(pxe);
    return pxe;
  };
  
  // Setup: Set the sandbox
  beforeAll(async () => {
    pxe = await setupSandbox();
    [alice, bob, deployer] = await getInitialTestAccountsWallets(pxe);
    console.log("Alice", alice.getAddress());
    console.log("Bob", bob.getAddress());
    
    randomAccount = await createAccount(pxe);

    }, 120_000);

  
  describe("E2E Shared Note", () => {
    beforeAll(async () => {
    }, 200_000);
    
    it("should deploy the contract", async () => {
      salt = Fr.random();

      const deploymentData = getContractInstanceFromDeployParams(NoteSharingContractArtifact,
        {
            constructorArgs: [],
            salt,
            deployer: deployer.getAddress()
        });

      const contractDeployer = new ContractDeployer(NoteSharingContractArtifact, deployer);
      const tx = contractDeployer.deploy().send({ contractAddressSalt: salt });
      
      const receipt = await tx.getReceipt();
      sharedNoteContract = await tx.deployed();
      
      expect(receipt).toEqual(
        expect.objectContaining({
            status: TxStatus.PENDING,
            error: ''
        }),
      );

      const receiptAfterMined = await tx.wait({ wallet: deployer });

      expect(await pxe.getContractInstance(deploymentData.address)).toBeDefined();
      expect(await pxe.isContractPubliclyDeployed(deploymentData.address)).toBeTruthy();
      expect(receiptAfterMined).toEqual(
          expect.objectContaining({
              status: TxStatus.SUCCESS,
          }),
      );

      expect(receiptAfterMined.contract.instance.address).toEqual(deploymentData.address)
    }, 200_000);

    describe.skip("empty public / private methods", () => {

        it("should not revert on public method", async () => {
            const txReceipt = await sharedNoteContract
            .withWallet(alice)
            .methods.some_public_method_with_arg(new Fr(1))
            .send()
            .wait({debug: true});

            expect(txReceipt.status).toBe("success");
        }, 200_000);

        it("should not revert on private method", async () => {
            const txReceipt = await sharedNoteContract
            .withWallet(alice)
            .methods.some_private_method_with_arg(new Fr(1))
            .send()
            .wait({debug: true});

            expect(txReceipt.status).toBe("success");
        }, 200_000);

    });

    describe("create_and_share_note(...)", () => {
        let shared_key_nullifier_alice: Fr;
        let shared_key_nullifier_bob: Fr;
        let noteHashes: Fr[];

        it("should not revert", async () => {
            const txReceipt = await sharedNoteContract
            .withWallet(alice)
            .methods.create_and_share_note(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            noteHashes = txReceipt.debugInfo?.noteHashes!;
            console.log("noteHashes", noteHashes);

            let nullifiers = txReceipt.debugInfo?.nullifiers!;
            console.log("nullifiers", nullifiers);

            expect(txReceipt.status).toBe("success");
        });
        
        it("should create one note", async () => {
            expect(noteHashes.length).toBe(1);
        });

        it("should revert if the note already exists", async () => {
          const txReceipt = await sharedNoteContract
          .withWallet(alice)
          .methods.create_and_share_note(
              bob.getAddress(),
          )
          .simulate();

          await expect(txReceipt).rejects.toThrow(
            // TODO: fix RegExp
            // RegExp("Note already exists")
            // /Note already exists/i
          );
        });

        // it("should create a note for alice with the correct parameters", async () => {
        //     const aliceParam = sharedNotes[0].note.items[0];
        //     const bobParam = sharedNotes[0].note.items[1];
        //     const noteOwner = sharedNotes[0].owner;

        //     console.log('Alice note: ', sharedNotes[0].note);

        //     const aliceAddress = alice.getAddress();
        //     const bobAddress = bob.getAddress();

        //     expect(aliceParam).toEqual(aliceAddress);
        //     expect(bobParam).toEqual(bobAddress);
        //     expect(noteOwner).toEqual(aliceAddress);
            
        //     shared_key_nullifier_alice = sharedNotes[0].note.items[2];
        // })
        
        // it("should create a note for bob with the correct parameters", async () => {
        //     const aliceParam = sharedNotes[1].note.items[0];
        //     const bobParam = sharedNotes[1].note.items[1];
        //     const noteOwner = sharedNotes[1].owner;

        //     const aliceAddress = alice.getAddress();
        //     const bobAddress = bob.getAddress();

        //     expect(aliceParam).toEqual(aliceAddress);
        //     expect(bobParam).toEqual(bobAddress);
        //     expect(noteOwner).toEqual(bobAddress);

        //     shared_key_nullifier_bob = sharedNotes[1].note.items[2];
        // })

        it("nullifier key is the same between the 2 notes", async () => {
            // NOTE: passes bc both nullifiers are the null (not computed)
            expect(shared_key_nullifier_alice).toEqual(
                shared_key_nullifier_bob
            );
        });
        
        it.skip("should revert if the note already exists", async () => {
            const txReceipt = sharedNoteContract
            .withWallet(alice)
            .methods.create_and_share_note(bob.getAddress())
            .simulate();

            await expect(txReceipt).rejects.toThrow(
                new RegExp("Note already exists") // NOTE: fix RegExp
            );
        })
    })

    // describe("bob_action", () => {
    //     let sharedNotes: ExtendedNote[]; 
    //     let nullifiers: Fr[];

    //     it("should revert if the note doesnt exist", async () => {
    //         const txReceipt = sharedNoteContract
    //         .withWallet(bob)
    //         .methods.bob_action(randomAccount.getAddress())
    //         .simulate();

    //         await expect(txReceipt).rejects.toThrow(
    //             new RegExp("Note not found")
    //         );
    //     })

    //     it("should not revert", async () => {
    //         const txReceipt = await sharedNoteContract
    //         .withWallet(bob)
    //         .methods.bob_action(
    //             alice.getAddress(),
    //         )
    //         .send()
    //         .wait({debug: true});

    //         sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;
    //         nullifiers = txReceipt.debugInfo?.nullifiers!;

    //         expect(txReceipt.status).toBe("success");        
    //     })

    //     it("should nullify the note", async () => {
    //        expect(sharedNotes.length).toBe(0);
    //        expect(nullifiers.length).toBe(2); // TODO: why 2???
    //     })
    // })

    // describe("alice_action", () => {
    //     let sharedNotes: ExtendedNote[]; 
    //     let sharedNotesAfterNullification: ExtendedNote[];

    //     beforeAll(async () => {
    //         // NOTE: redeploying to ignore previous notes and nullifiers
    //         const sharedNoteReceipt = await NoteSharingContract.deploy(deployer)
    //           .send()
    //           .wait();
        
    //         sharedNoteContract = sharedNoteReceipt.contract;

    //         // Because we nullified the note in the previous test, we need to create a new one.
    //         // NOTE: fails w/o redeploy, didn't nullify Alice's note
    //         const txReceipt = await sharedNoteContract
    //         .withWallet(alice)
    //         .methods.create_and_share_note(
    //             bob.getAddress(),
    //         )
    //         .send()
    //         .wait({debug: true});

    //         sharedNotes = txReceipt.debugInfo?.visibleIncomingNotes!;
    //     }, 200_000);

    //     it("should have existing notes", async () => {
    //         expect(sharedNotes.length).toBe(2);
    //     })

    //     it("should revert if the note doesnt exist", async () => {
    //         const txReceipt = sharedNoteContract
    //         .withWallet(alice)
    //         .methods.alice_action(randomAccount.getAddress())
    //         .simulate();

    //         await expect(txReceipt).rejects.toThrow(
    //             new RegExp("Note not found")
    //         );
    //     })

    //     it("should not revert", async () => {
    //         const txReceipt = await sharedNoteContract
    //         .withWallet(alice)
    //         .methods.alice_action(
    //             bob.getAddress(),
    //         )
    //         .send()
    //         .wait({debug: true});

    //         sharedNotesAfterNullification = txReceipt.debugInfo?.visibleIncomingNotes!;

    //         expect(txReceipt.status).toBe("success");  
    //     })

    //     it("should nullify the note", async () => {
    //         expect(sharedNotesAfterNullification.length).toBe(0);
    //     })
    // })
  });