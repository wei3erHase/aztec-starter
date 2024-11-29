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
    TxHash,
    TxStatus,
    waitForPXE,
  } from "@aztec/aztec.js";
  
  import { NoteSharingContractArtifact, NoteSharingContract } from "../artifacts/NoteSharing.ts";
  import { createAccount, deployInitialTestAccounts, getInitialTestAccountsWallets } from "@aztec/accounts/testing";
  
  // Global variables
  let pxe: PXE;
  let pxe_alice: PXE;
  let pxe_bob: PXE;
  let sharedNoteContract: Contract;
  
  let alice: AccountWalletWithSecretKey;
  let bob: AccountWalletWithSecretKey;
  let deployer: AccountWalletWithSecretKey;
  let randomAccount: AccountWalletWithSecretKey;
  let salt: Fr;
  let txHash: TxHash;
  
  // cd ~/.aztec && docker-compose -f ./docker-compose.sandbox.yml up
  const { PXE_URL = 'http://localhost:8080' } = process.env;
  // aztec start --port 8081 --pxe --pxe.nodeUrl http://host.docker.internal:8080/
  const PXE_ALICE = 'http://localhost:8081';
  // aztec start --port 8082 --pxe --pxe.nodeUrl http://host.docker.internal:8080/
  const PXE_BOB = 'http://localhost:8082';
  
  const setupSandbox = async () => {
    pxe = createPXEClient(PXE_URL);
    pxe_alice = createPXEClient(PXE_ALICE);
    pxe_bob = createPXEClient(PXE_BOB);
    await waitForPXE(pxe);
    await waitForPXE(pxe_alice); // TODO: is this needed?
    await waitForPXE(pxe_bob);   // TODO: is this needed?
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

    describe("create_and_share_note(...)", () => {
        let shared_key_nullifier_alice: Fr;
        let shared_key_nullifier_bob: Fr;
        let noteHashes: Fr[];
        let nullifiers: Fr[];

        it("should not revert", async () => {
            const txReceipt = await sharedNoteContract
            .withWallet(alice)
            .methods.create_and_share_note(
                bob.getAddress(),
            )
            .send()
            .wait({debug: true});

            txHash = txReceipt.txHash;

            noteHashes = txReceipt.debugInfo?.noteHashes!;
            console.log("noteHashes", noteHashes);

            nullifiers = txReceipt.debugInfo?.nullifiers!;
            console.log("nullifiers", nullifiers);

            expect(txReceipt.status).toBe("success");
        });
        
        it("should create one note", async () => {
            expect(noteHashes.length).toBe(1);
        });
        
        it("should create one nullifier", async () => {
            expect(nullifiers.length).toBe(1);
        });

        it("should create two encrypted note logs", async () => {
          const effect = await pxe.getTxEffect(txHash);
          console.log({effect});
          
          const noteEncryptedLogs = effect?.data.noteEncryptedLogs;
          expect(noteEncryptedLogs!.functionLogs[0].logs.length).toBe(2);
        });

        // TODO: register Alice's PK in PXE and decrypt the encrypted logs
        it("should be readable from Alice's wallet", async () => {
          pxe_alice.registerContact(alice.getAddress());
          
          const incomingNotes = await pxe_alice.getIncomingNotes({ txHash });
          console.log({incomingNotes}) // NOTE: empty array

          expect(incomingNotes.length).toBeGreaterThan(0); // NOTE: fails
        });

        it.skip("should be readable from Bob's wallet", async () => {
          pxe_bob.registerContact(bob.getAddress());

          const incomingNotes = await pxe_bob.getIncomingNotes({ txHash });
          const outgoingNotes = await pxe.getOutgoingNotes({ txHash });

          const effect = await pxe.getTxEffect(txHash)
          const effect_alice = await pxe_alice.getTxEffect(txHash)
          const effect_bob = await pxe_bob.getTxEffect(txHash)

          console.log({effect})
          console.log({effect_alice})
          console.log({effect_bob})

          console.log({incomingNotes}) // NOTE: empty array
          console.log({outgoingNotes}) // NOTE: empty array

          expect(incomingNotes.length).toBeGreaterThan(0); // NOTE: fails
        });
        
        it.skip("should revert if the note already exists", async () => {
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
      let noteHashes: Fr[];
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

            noteHashes = txReceipt.debugInfo?.noteHashes!;
            nullifiers = txReceipt.debugInfo?.nullifiers!;

            expect(txReceipt.status).toBe("success");        
        })

        it("should nullify the note", async () => {
           expect(noteHashes.length).toBe(0);
           expect(nullifiers.length).toBe(2); // TODO: why 2??
        })
    })

    describe("alice_action", () => {
        let noteHashes: Fr[];
        let nullifiers: Fr[];

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

            noteHashes = txReceipt.debugInfo?.noteHashes!;
        }, 200_000);

        it("should have existing notes", async () => {
            expect(noteHashes.length).toBe(1);
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

            expect(txReceipt.status).toBe("success");  
        })

        it("should avoid bob from calling his method", async () => {
          const txReceipt = sharedNoteContract
          .withWallet(bob)
          .methods.bob_action(alice.getAddress())
          .simulate();

          await expect(txReceipt).rejects.toThrow(
              new RegExp("Note not found")
          );
        })
    })
  });