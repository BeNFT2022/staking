import type { FC } from "react";
import React, { useCallback, useEffect, useState } from "react";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

import {
    BENFT_TOKEN_DECIMALS,
    createStakeAuxAccountTransaction,
    getStakesForAccount
} from "./lib";

export const Stake: FC = () => {
    let { connection } = useConnection();
    let { publicKey, sendTransaction } = useWallet();

    let [amount, setAmount] = useState<string>("0");

    let [stakedAccounts, setStakedAccounts] = useState<any[]>([]);
    useEffect(() => {
        (async () => {
            if (!publicKey) return;
            let stakedAccounts = await getStakesForAccount(
                connection,
                publicKey
            );
            setStakedAccounts(stakedAccounts);

            console.log(stakedAccounts);
        })();
    }, [connection, publicKey]);

    let [logs, setLogs] = useState<string[]>([]);
    const log = useCallback(
        (message: string) => {
            console.log(message);
            setLogs(logs.concat(message));
        },
        [logs]
    );

    const handleStake = useCallback(
        () =>
            (async () => {
                if (!publicKey) return;

                log(`requesting stake for ${amount} tokens`);

                let tx;
                try {
                    let tokenAmount =
                        BigInt(amount) * BigInt(10 ** BENFT_TOKEN_DECIMALS);
                    tx = await createStakeAuxAccountTransaction(
                        connection,
                        publicKey,
                        tokenAmount
                    );
                } catch (e: any) {
                    console.error(e);
                    log(`error: ${e.message}`);
                    return;
                }

                let signature;
                try {
                    signature = await sendTransaction(tx, connection);
                    log(
                        `stake for ${amount} tokens successful: transaction signature ${signature}`
                    );
                } catch (e: any) {
                    console.error(e);
                    log(
                        `stake for ${amount} tokens unsuccessful: ${e.message}`
                    );
                }
            })(),
        [publicKey, connection, amount, sendTransaction, log]
    );

    return (
        <>
            <WalletMultiButton />

            <h2>Stake BeNFT</h2>
            <div>
                Amount:{" "}
                <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                />
            </div>
            <div>
                <button onClick={handleStake}>Stake</button>
            </div>

            <section>
                <div>Logs</div>
                <pre>{logs.join("\n")}</pre>
            </section>
        </>
    );
};

export default Stake;
