import { Buffer } from "buffer";

import {
    ConnectionProvider,
    WalletProvider
} from "@solana/wallet-adapter-react";
import { WalletAdapterNetwork } from "@solana/wallet-adapter-base";
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    SolletExtensionWalletAdapter,
    SolletWalletAdapter,
    TorusWalletAdapter
} from "@solana/wallet-adapter-wallets";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import React, { FC } from "react";

import Stake from "./Stake";

require("./App.css");
require("@solana/wallet-adapter-react-ui/styles.css");

global.Buffer = Buffer;

const endpoint = process.env.REACT_APP_RPC_URL!;

export const App: FC = () => {
    const network = process.env.REACT_APP_NETWORK as WalletAdapterNetwork;
    const wallets = [
        new PhantomWalletAdapter(),
        new SolflareWalletAdapter(),
        new SolletWalletAdapter({ network }),
        new SolletExtensionWalletAdapter({ network }),
        new TorusWalletAdapter()
    ];

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets} autoConnect>
                <WalletModalProvider>
                    <Stake />
                </WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export default App;
