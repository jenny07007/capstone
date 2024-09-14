import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../../target/types/deserhub";
import { expect } from "chai";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// pay for a paper access pass successfully
export async function payForPaperAccessPass(
  program: Program<Deserhub>,
  provider: anchor.AnchorProvider,
  paperEntry: anchor.web3.Keypair,
  owner_keypair: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
) {
  const paperEntryData = await program.account.paperEntry.fetch(
    paperEntry.publicKey,
  );

  // get researcher's initial balance
  const initialResearcherBalance = await provider.connection.getBalance(
    paperEntryData.researcher,
  );

  const purchasedAtClient = new anchor.BN(Date.now() / 1000); // in seconds

  // generate pda for paper access pass
  const [paperAccessPassPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("paper_access_pass"),
      owner_keypair.publicKey.toBuffer(),
      paperEntry.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const tx = await program.methods
    .payPass()
    .accountsStrict({
      paperEntry: paperEntry.publicKey,
      paperAccessPass: paperAccessPassPda,
      researcher: paperEntryData.researcher,
      owner: owner_keypair.publicKey,
      platform: platformPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([owner_keypair])
    .rpc();

  console.log(`Pay for paper access pass transaction signature: ${tx}`);

  const paperAccessPassState = await program.account.paperAccessPass.fetch(
    paperAccessPassPda,
  );

  const purchasedAtOnChain = paperAccessPassState.purchasedAt.toNumber();
  const acceptableDelay = 1;

  expect(
    Math.abs(purchasedAtOnChain - purchasedAtClient.toNumber()),
  ).to.be.lessThanOrEqual(acceptableDelay);

  expect(paperAccessPassState.owner.toBase58()).to.equal(
    owner_keypair.publicKey.toBase58(),
  );
  expect(paperAccessPassState.paperEntry.toBase58()).to.equal(
    paperEntry.publicKey.toBase58(),
  );
  expect(paperAccessPassState.mint).to.be.null;

  // check if the paper access pass is created
  const paperAccessPassAccountInfo = await provider.connection.getAccountInfo(
    paperAccessPassPda,
  );
  expect(paperAccessPassAccountInfo).is.not.null;

  // check if the researcher's balance has increased by the paper entry price
  const finalResearcherBalance = await provider.connection.getBalance(
    paperEntryData.researcher,
  );
  const expectedIncrease = paperEntryData.price.toNumber();
  expect(finalResearcherBalance).to.equal(
    initialResearcherBalance + expectedIncrease,
  );

  console.log(
    `Researcher balance increased by ${
      expectedIncrease / LAMPORTS_PER_SOL
    } SOL`,
  );
}

// no payment for open access paper
export async function noPaymentForOpenAccessPaper(
  program: Program<Deserhub>,
  provider: anchor.AnchorProvider,
  researcher_keypair: anchor.web3.Keypair,
  owner_keypair: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
) {
  const openAccessPaperEntry = anchor.web3.Keypair.generate();
  const openAccessTitle = "Open Access Paper";
  const openAccessDescription = "This is an open access paper";
  const openAccessUri = "https://example.com/open-access-paper";

  await program.methods
    .createPaper(
      openAccessTitle,
      openAccessDescription,
      openAccessUri,
      true, // is_open_access
      new anchor.BN(0), // price should be 0 for open access
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

  // get the initial balance of the owner
  const initialOwnerBalance = await provider.connection.getBalance(
    owner_keypair.publicKey,
  );

  // generate pda for paper access pass
  const [openAccessPassPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("paper_access_pass"),
      owner_keypair.publicKey.toBuffer(),
      openAccessPaperEntry.publicKey.toBuffer(),
    ],
    program.programId,
  );

  const purchasedAtClient = new anchor.BN(Date.now() / 1000); // in seconds

  // try to pay for the access pass (which should be free)
  await program.methods
    .payPass()
    .accountsStrict({
      paperEntry: openAccessPaperEntry.publicKey,
      paperAccessPass: openAccessPassPda,
      researcher: researcher_keypair.publicKey,
      owner: owner_keypair.publicKey,
      platform: platformPda,
      systemProgram: anchor.web3.SystemProgram.programId,
    })
    .signers([owner_keypair])
    .rpc();

  // check if the paper access pass was created
  const paperAccessPassState = await program.account.paperAccessPass.fetch(
    openAccessPassPda,
  );
  const paperAccessPassAccountInfo = await provider.connection.getAccountInfo(
    openAccessPassPda,
  );

  const rentExemptionAmount =
    await provider.connection.getMinimumBalanceForRentExemption(
      paperAccessPassAccountInfo?.data.length ?? 0,
    );

  const purchasedAtOnChain = paperAccessPassState.purchasedAt.toNumber();
  const acceptableDelay = 1;

  expect(paperAccessPassState.owner.toBase58()).to.equal(
    owner_keypair.publicKey.toBase58(),
  );

  expect(paperAccessPassState.paperEntry.toBase58()).to.equal(
    openAccessPaperEntry.publicKey.toBase58(),
  );

  expect(paperAccessPassState.price.toNumber()).to.equal(0);

  expect(
    Math.abs(purchasedAtOnChain - purchasedAtClient.toNumber()),
  ).to.be.lessThanOrEqual(acceptableDelay);

  expect(paperAccessPassState.mint).to.be.null;

  // verify that the owner's balance hasn't changed
  const finalOwnerBalance = await provider.connection.getBalance(
    owner_keypair.publicKey,
  );

  // check if the rent exemption amount is subtracted from the owner's balance
  expect(finalOwnerBalance).to.equal(initialOwnerBalance - rentExemptionAmount);

  console.log(
    `Final Owner Balance: ${finalOwnerBalance / LAMPORTS_PER_SOL} SOL`,
  );
}
