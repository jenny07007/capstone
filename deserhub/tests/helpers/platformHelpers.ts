import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../../target/types/deserhub";
import { expect } from "chai";
import crypto from "crypto";

export async function initializePlatform(
  program: Program<Deserhub>,
  admin_wallet: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
  listingFeeBps: number,
) {
  const tx = await program.methods
    .initialize("DeSerHub", listingFeeBps)
    .accountsStrict({
      admin: admin_wallet.publicKey,
      platform: platformPda,
      treasury: treasuryPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([admin_wallet])
    .rpc();

  const platformState = await program.account.platform.fetch(platformPda);
  expect(platformState.listingFeeBps).to.equal(listingFeeBps);
  expect(platformState.name).to.equal(/deserhub/i);

  console.log(`Initialize platform transaction signature: ${tx}`);
}

export async function expectErrorOnInvalidFee(
  program: Program<Deserhub>,
  admin_wallet: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
) {
  try {
    await program.methods
      .initialize(crypto.randomUUID().slice(0, 10), 801)
      .accountsStrict({
        admin: admin_wallet.publicKey,
        platform: platformPda,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin_wallet])
      .rpc();
    expect.fail("Expected an error to be thrown");
  } catch (error) {
    expect(error.toString()).to.match(/Invalid listing fee/i);
  }
}

export async function expectErrorOnInvalidNameLength(
  program: Program<Deserhub>,
  admin_wallet: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
) {
  try {
    await program.methods
      .initialize(crypto.randomUUID().slice(0, 21), 800)
      .accountsStrict({
        admin: admin_wallet.publicKey,
        platform: platformPda,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin_wallet])
      .rpc();
    expect.fail("Expected an error to be thrown");
  } catch (error) {
    expect(error.toString()).to.match(/Invalid name length/i);
  }
}
