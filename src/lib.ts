import type { Connection } from "@solana/web3.js";
import {
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram
} from "@solana/web3.js";

import {
    ACCOUNT_SIZE,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    AuthorityType,
    createApproveInstruction,
    createInitializeAccountInstruction,
    createSetAuthorityInstruction,
    createTransferInstruction
} from "@solana/spl-token";

export const BENFT_TOKEN_ADDRESS = new PublicKey(
    "BeNFTTK1zwAnDHTPmzGEnvfZzdWEBKZ1wt4BKkmKtXTv"
);
export const BENFT_TOKEN_DECIMALS = 9;

const TOKEN_ACCOUNT_MINIMUM_BALANCE = 2039280;

export const STAKING_AUTHORITY_ADDRESS = new PublicKey(
    process.env.REACT_APP_STAKING_AUTHORITY_ADDRESS!
);

export async function createStakeAuxAccountTransaction(
    connection: Connection,
    wallet: PublicKey,
    amount: bigint
): Promise<Transaction> {
    let auxAccount: Keypair = Keypair.generate();
    let benftSource = getAssociatedTokenAddress(wallet, BENFT_TOKEN_ADDRESS);

    let tx = new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: auxAccount.publicKey,
            space: ACCOUNT_SIZE,
            lamports: TOKEN_ACCOUNT_MINIMUM_BALANCE,
            programId: TOKEN_PROGRAM_ID
        }),

        // create account with wallet as owner
        createInitializeAccountInstruction(
            auxAccount.publicKey,
            BENFT_TOKEN_ADDRESS,
            wallet
        ),

        // transfer tokens
        createTransferInstruction(
            benftSource,
            auxAccount.publicKey,
            wallet,
            amount
        ),

        // assign self as delegate
        // delegate amount is 0, only used to keep track of who sent the tokens
        createApproveInstruction(auxAccount.publicKey, wallet, wallet, 0),

        // set staking authority as the account owner
        createSetAuthorityInstruction(
            auxAccount.publicKey,
            wallet,
            AuthorityType.AccountOwner,
            STAKING_AUTHORITY_ADDRESS
        ),

        // set staking authority as the close authority
        createSetAuthorityInstruction(
            auxAccount.publicKey,
            wallet,
            AuthorityType.CloseAccount,
            STAKING_AUTHORITY_ADDRESS
        )
    );

    tx.feePayer = wallet;
    tx.recentBlockhash = await connection
        .getLatestBlockhash()
        .then(({ blockhash }) => blockhash);

    tx.partialSign(auxAccount);

    return tx;
}

function getAssociatedTokenAddress(
    owner: PublicKey,
    mint: PublicKey
): PublicKey {
    let [address] = PublicKey.findProgramAddressSync(
        [owner.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mint.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return address;
}

export async function getStakesForAccount(
    connection: Connection,
    wallet: PublicKey
): Promise<any> {
    let programAccounts = await connection.getParsedProgramAccounts(
        ASSOCIATED_TOKEN_PROGRAM_ID,
        {
            filters: [
                {
                    dataSize: 165
                },
                {
                    memcmp: {
                        offset: 0,
                        bytes: BENFT_TOKEN_ADDRESS.toBase58()
                    }
                },
                {
                    memcmp: {
                        offset: 78,
                        bytes: wallet.toBase58()
                    }
                }
            ]
        }
    );

    return programAccounts;
}
