import { Program, AnchorProvider, Wallet, Idl } from "@project-serum/anchor";
import {
  Connection,
  Keypair,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import * as idlJson from "./deserhub.json";
import type { Deserhub } from "./deserhub";
import dev_wallet from "./dev_wallet.json";

async function main() {
  try {
    const connection = new Connection(
      "https://api.devnet.solana.com",
      "confirmed",
    );
    const wallet = Keypair.fromSecretKey(Uint8Array.from(dev_wallet));
    const admin_wallet = new Wallet(wallet);
    const provider = new AnchorProvider(connection, admin_wallet, {});

    const programId = new PublicKey(
      "J4BSb2jYCnLsxAiaEeVktKfSjbAwUiDV8X5KzFhqkR2T",
    );

    const program = new Program(idlJson as unknown as Idl, programId, provider);

    console.log(admin_wallet.publicKey.toBase58());
    const balance = await connection.getBalance(admin_wallet.publicKey);
    console.log(balance / LAMPORTS_PER_SOL);
  } catch (error) {
    console.error("An error occurred:", error);
  }
}

main().catch((error) => {
  console.error("Unhandled error:", error);
  process.exit(1);
});
