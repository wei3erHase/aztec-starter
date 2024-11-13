import { NoteSharingContractArtifact, NoteSharingContract } from "../src/artifacts/NoteSharing.js"
import { AccountWallet, CompleteAddress, ContractDeployer, createDebugLogger, Fr, PXE, waitForPXE, TxStatus, createPXEClient, getContractInstanceFromDeployParams, DebugLogger } from "@aztec/aztec.js";
import { getSchnorrAccount } from '@aztec/accounts/schnorr';
import { AztecAddress, deriveSigningKey } from '@aztec/circuits.js';
import { TokenContract } from "@aztec/noir-contracts.js";
import { getInitialTestAccountsWallets } from "@aztec/accounts/testing";

const setupSandbox = async () => {
    const { PXE_URL = 'http://localhost:8080' } = process.env;
    const pxe = await createPXEClient(PXE_URL);
    await waitForPXE(pxe);
    return pxe;
};

// NOTE: result of `yarn deploy`
const deployedContract = AztecAddress.fromString('0x242e818979aff782407763d3f1de375a3150d510721c71b10a16f114473f7d94');

async function main() {

    let pxe: PXE;
    let wallets: AccountWallet[] = [];
    let accounts: CompleteAddress[] = [];
    let logger: DebugLogger;

    logger = createDebugLogger('aztec:aztec-starter');

    pxe = await setupSandbox();
    wallets = await getInitialTestAccountsWallets(pxe);
    
    const votingContract = await NoteSharingContract.at(deployedContract, wallets[0]);
    
    console.log('alice - bob setup');
    console.log('alice action');
    await votingContract.withWallet(wallets[0]).methods.create_and_share_note(wallets[1].getAddress()).send().wait();
    console.log('bob action');
    await votingContract.withWallet(wallets[1]).methods.bob_action(wallets[0].getAddress()).send().wait();

    console.log('alice - alice setup');
    console.log('alice action');
    await votingContract.withWallet(wallets[0]).methods.create_and_share_note(wallets[1].getAddress()).send().wait();
    console.log('alice 2nd action');
    await votingContract.withWallet(wallets[0]).methods.alice_action(wallets[1].getAddress()).send().wait();
}

main();
