import type { FC } from "react";
import React, { useCallback, useState } from "react";
import { Buffer } from "buffer";

import { Transaction } from "@solana/web3.js";

import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";

export const Stake: FC = () => {
    let { connection } = useConnection();
    let { publicKey, sendTransaction } = useWallet();

    let [amount, setAmount] = useState<string>("0");

    let logs: string[] = [];
    const handleStake = useCallback(
        () =>
            (async () => {
                if (!publicKey) return;

                logs.push(`requesting stake for ${amount} tokens`);
                let response = await fetch("/api/stake", {
                    method: "POST",
                    headers: {
                        "content-type": "application/json"
                    },
                    body: JSON.stringify({
                        wallet: publicKey,
                        amount: parseInt(amount)
                    })
                });
                let json = await response.json();

                if (!response.ok) {
                    logs.push(`error: ${json.error}`);
                    return;
                }

                let tx = Transaction.from(
                    Buffer.from(json.transaction, "base64")
                );

                let signature;
                try {
                    signature = await sendTransaction(tx, connection);
                    console.log(signature);
                    logs.push(
                        `stake for ${amount} tokens successful: transaction signature ${signature}`
                    );
                } catch (e: any) {
                    console.error(e);
                    logs.push(
                        `stake for ${amount} tokens unsuccessful: ${e.message}`
                    );
                }
            })(),
        [publicKey, connection, amount, sendTransaction]
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
                <div>{logs.join("\n")}</div>
            </section>
        </>
    );
};

export default Stake;
