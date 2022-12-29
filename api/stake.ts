import type { VercelRequest, VercelResponse } from "@vercel/node";

import {
    Connection,
    Keypair,
    PublicKey,
    Transaction,
    SystemProgram
} from "@solana/web3.js";
import {
    ACCOUNT_SIZE,
    TOKEN_PROGRAM_ID,
    ASSOCIATED_TOKEN_PROGRAM_ID,
    createApproveInstruction,
    createFreezeAccountInstruction,
    createInitializeAccountInstruction,
    createTransferInstruction
} from "@solana/spl-token";

const TOKEN_ACCOUNT_MINIMUM_BALANCE = 2039280;
const BENFT_TOKEN_ADDRESS = new PublicKey(
    "BeNFTTK1zwAnDHTPmzGEnvfZzdWEBKZ1wt4BKkmKtXTv"
);
const BENFT_TOKEN_DECIMALS = 9n;

const DELEGATE_AUTHORITY_ADDRESS = new PublicKey(
    process.env.DELEGATE_AUTHORITY_ADDRESS!
);
const BENFT_FREEZE_AUTHORITY_KEYPAIR = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(process.env.BENFT_FREEZE_AUTHORITY_KEYPAIR!))
);

const connection = new Connection(process.env.REACT_APP_RPC_URL!);

export default async function swap(
    request: VercelRequest,
    response: VercelResponse
) {
    function error(statusOrMessage: number | string, optionalMessage?: string) {
        let status = 400;
        let message = statusOrMessage;
        if (optionalMessage && typeof statusOrMessage == "number") {
            status = statusOrMessage;
            message = optionalMessage;
        }

        console.error(`error: ${status} ${message}`);

        return response.status(400).json({ error: message });
    }

    let { wallet: walletAddress, amount } = request.body;
    if (!PublicKey.isOnCurve(walletAddress)) {
        error(`wallet must be an on-curve public key, got: ${walletAddress}`);
        return;
    }
    let wallet = new PublicKey(walletAddress);
    if (!isNaN(parseInt(amount)) && amount <= 0) {
        error(`amount must be greater than 0, got: ${amount}`);
        return;
    }

    let amountWithDecimals = BigInt(amount) * 10n ** BENFT_TOKEN_DECIMALS;

    let auxAccountKeypair = Keypair.generate();
    let tx = createAndFreezeStakeAuxAccount(
        wallet,
        amountWithDecimals,
        auxAccountKeypair.publicKey
    );
    tx.feePayer = wallet;
    tx.recentBlockhash = await connection
        .getLatestBlockhash()
        .then(({ blockhash }) => blockhash);

    tx.partialSign(BENFT_FREEZE_AUTHORITY_KEYPAIR);
    tx.partialSign(auxAccountKeypair);

    response.status(200).json({
        transaction: tx
            .serialize({ requireAllSignatures: false })
            .toString("base64")
    });
}

function createAndFreezeStakeAuxAccount(
    wallet: PublicKey,
    amount: bigint,
    auxAccount: PublicKey
): Transaction {
    let benftSource = getAssociatedTokenAddress(wallet, BENFT_TOKEN_ADDRESS);

    return new Transaction().add(
        SystemProgram.createAccount({
            fromPubkey: wallet,
            newAccountPubkey: auxAccount,
            space: ACCOUNT_SIZE,
            lamports: TOKEN_ACCOUNT_MINIMUM_BALANCE,
            programId: TOKEN_PROGRAM_ID
        }),

        createInitializeAccountInstruction(
            auxAccount,
            BENFT_TOKEN_ADDRESS,
            wallet
        ),

        createTransferInstruction(benftSource, auxAccount, wallet, amount),

        createApproveInstruction(
            auxAccount,
            DELEGATE_AUTHORITY_ADDRESS,
            wallet,
            amount
        ),

        createFreezeAccountInstruction(
            auxAccount,
            BENFT_TOKEN_ADDRESS,
            BENFT_FREEZE_AUTHORITY_KEYPAIR.publicKey
        )
    );
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
