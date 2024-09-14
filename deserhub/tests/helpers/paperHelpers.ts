import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../../target/types/deserhub";
import { expect } from "chai";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// create a paid access paper
export async function createPaidAccessPaper(
  program: Program<Deserhub>,
  provider: anchor.AnchorProvider,
  platformPda: anchor.web3.PublicKey,
  paperEntry: anchor.web3.Keypair,
  researcher_keypair: anchor.web3.Keypair,
  treasuryPda: anchor.web3.PublicKey,
  listingFeeBps: number,
) {
  const initialTreasuryBalance = await provider.connection.getBalance(
    treasuryPda,
  );
  const paperPrice = new anchor.BN(1e9); // 1 SOL in lamports

  const tx = await program.methods
    .createPaper(
      "Test Paper",
      "Description",
      "https://example.com/paper",
      false,
      paperPrice,
    )
    .accountsStrict({
      platform: platformPda,
      paperEntry: paperEntry.publicKey,
      researcher: researcher_keypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      treasury: treasuryPda,
    })
    .signers([researcher_keypair, paperEntry])
    .rpc();

  const paperState = await program.account.paperEntry.fetch(
    paperEntry.publicKey,
  );
  expect(paperState.title).to.equal("Test Paper");
  expect(paperState.price.eq(paperPrice)).to.be.true;

  const treasuryBalance = await provider.connection.getBalance(treasuryPda);
  const expectedTreasuryBalance =
    initialTreasuryBalance + (paperPrice.toNumber() * listingFeeBps) / 10000;
  expect(treasuryBalance).to.equal(expectedTreasuryBalance);

  console.log(
    `Paper entry price: ${paperState.price.toNumber() / LAMPORTS_PER_SOL} SOL`,
  );
  console.log(`Treasury balance: ${treasuryBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Create paper transaction signature: ${tx}`);
}

// create an open access paper
export async function createOpenAccessPaper(
  program: Program<Deserhub>,
  provider: anchor.AnchorProvider,
  platformPda: anchor.web3.PublicKey,
  researcher_keypair: anchor.web3.Keypair,
  treasuryPda: anchor.web3.PublicKey,
) {
  const initialTreasuryBalance = await provider.connection.getBalance(
    treasuryPda,
  );
  const openAccessPaperEntry = anchor.web3.Keypair.generate();

  const tx = await program.methods
    .createPaper(
      "Open Access Paper",
      "Description",
      "https://example.com/open-access-paper",
      true,
      new anchor.BN(0),
    )
    .accountsStrict({
      platform: platformPda,
      paperEntry: openAccessPaperEntry.publicKey,
      researcher: researcher_keypair.publicKey,
      systemProgram: anchor.web3.SystemProgram.programId,
      treasury: treasuryPda,
    })
    .signers([researcher_keypair, openAccessPaperEntry])
    .rpc();

  const paperState = await program.account.paperEntry.fetch(
    openAccessPaperEntry.publicKey,
  );
  expect(paperState.isOpenAccess).to.be.true;
  expect(paperState.price.eq(new anchor.BN(0))).to.be.true;

  const treasuryBalance = await provider.connection.getBalance(treasuryPda);
  expect(treasuryBalance).to.equal(initialTreasuryBalance);

  console.log(
    `Paper entry price: ${paperState.price.toNumber() / LAMPORTS_PER_SOL} SOL`,
  );
  console.log(`Treasury balance: ${treasuryBalance / LAMPORTS_PER_SOL} SOL`);
  console.log(`Create open access paper transaction signature: ${tx}`);
}

// expect an error when creating an open access paper with a non-zero price
export async function expectErrorOnInvalidOpenAccessPaper(
  program: Program<Deserhub>,
  researcher_keypair: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
) {
  const openAccessPaperEntry = anchor.web3.Keypair.generate();
  try {
    await program.methods
      .createPaper(
        "Invalid Open Access",
        "Description",
        "https://example.com/invalid",
        true,
        new anchor.BN(1e9),
      )
      .accountsStrict({
        platform: platformPda,
        paperEntry: openAccessPaperEntry.publicKey,
        researcher: researcher_keypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        treasury: treasuryPda,
      })
      .signers([researcher_keypair, openAccessPaperEntry])
      .rpc();
    expect.fail("Expected an error to be thrown");
  } catch (error) {
    expect(error.toString()).to.match(/Invalid price/i);
  }
}
