import { TokenVotesContractArtifact, TokenVotesContract } from "../../../artifacts/TokenVotes.js"
import { AccountWallet, CompleteAddress, ContractDeployer, createLogger, Fr, PXE, waitForPXE, TxStatus, createPXEClient, getContractInstanceFromDeployParams, Logger } from "@aztec/aztec.js";
import { deployInitialTestAccounts, getInitialTestAccountsWallets } from "@aztec/accounts/testing"

const setupSandbox = async () => {
    const { PXE_URL = 'http://localhost:8080' } = process.env;
    // TODO: implement reading the DelegationNote from an isolated PXE
    // 8080: cd ~/.aztec && docker-compose -f ./docker-compose.sandbox.yml up
    // 8081: aztec start --port 8081 --pxe --pxe.nodeUrl http://host.docker.internal:8080/
    // const DELEGATEE_PXE_URL = 'http://localhost:8081';

    const pxe = createPXEClient(PXE_URL);
    await waitForPXE(pxe);
    return pxe;
};

describe("TokenVotes", () => {
    let pxe: PXE;
    let wallets: AccountWallet[] = [];
    let accounts: CompleteAddress[] = [];
    let logger: Logger;

    beforeAll(async () => {
        logger = createLogger('aztec:aztec-starter');
        logger.info("Aztec-Starter tests running.")

        pxe = await setupSandbox();
        // deployInitialTestAccounts(pxe); // NOTE: run at least once in sandbox to circumvent issue #9384

        wallets = await getInitialTestAccountsWallets(pxe);
        accounts = wallets.map(w => w.getCompleteAddress())
    })

    it("Deploys the contract", async () => {
        // const salt = Fr.random();
        // const TokenVotesArtifact = TokenVotesContractArtifact
        // const [deployerWallet, adminWallet] = wallets; // using first account as deployer and second as contract admin
        // const adminAddress = adminWallet.getCompleteAddress().address;

        // const deploymentData = getContractInstanceFromDeployParams(TokenVotesArtifact,
        //     {
        //         constructorArgs: [adminAddress],
        //         salt,
        //         deployer: deployerWallet.getAddress()
        //     });
        // const deployer = new ContractDeployer(TokenVotesArtifact, deployerWallet);
        // const tx = deployer.deploy(adminAddress).send({ contractAddressSalt: salt })
        // const receipt = await tx.getReceipt();

        // expect(receipt).toEqual(
        //     expect.objectContaining({
        //         status: TxStatus.PENDING,
        //         error: ''
        //     }),
        // );

        // const receiptAfterMined = await tx.wait({ wallet: deployerWallet });

        // expect(await pxe.getContractInstance(deploymentData.address)).toBeDefined();
        // expect(await pxe.isContractPubliclyDeployed(deploymentData.address)).toBeTruthy();
        // expect(receiptAfterMined).toEqual(
        //     expect.objectContaining({
        //         status: TxStatus.SUCCESS,
        //     }),
        // );

        // expect(receiptAfterMined.contract.instance.address).toEqual(deploymentData.address)
    }, 300_000)

});