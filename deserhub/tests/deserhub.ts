import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../target/types/deserhub";
import { expect } from "chai";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";

describe("Deserhub", () => {
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Deserhub as Program<Deserhub>;

  // Wallets and Constants
  const admin_wallet = anchor.web3.Keypair.generate();
  const researcher_keypair = anchor.web3.Keypair.generate();
  const listingFeeBps = 800;

  // PDAs
  const [platformPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("platform"), admin_wallet.publicKey.toBuffer()],
    program.programId,
  );
  const [treasuryPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("treasury"),
      platformPda.toBuffer(),
      admin_wallet.publicKey.toBuffer(),
    ],
    program.programId,
  );

  before(async () => {
    await airdropToWallets([admin_wallet, researcher_keypair]);
  });

  /********************************************
                    Tests 
   ********************************************/

  describe("Platform Initialization", () => {
    it("should init platform 🚀", async () => {
      await initializePlatform();
    });

    // This will fail if the platform is already initialized ⬆︎
    it.skip("should throw error when fee is greater than 800 bps", async () => {
      await expectErrorOnInvalidFee();
    });
  });

  describe("Create Paper Entry 🧬", () => {
    it("should create a paper successfully", async () => {
      await createPaperSuccessfully();
    });

    it("should not charge fee when paper is open access", async () => {
      await createOpenAccessPaper();
    });

    it("should throw error when open access is true but price is greater than 0", async () => {
      await expectErrorOnInvalidOpenAccessPaper();
    });
  });

  describe("Paper Access Pass 🤑", () => {});

  /********************************************
                Helper functions
   ********************************************/

  // Helper functions for platform initialization
  async function airdropToWallets(wallets: anchor.web3.Keypair[]) {
    const airdropPromises = wallets.map((wallet) =>
      provider.connection
        .requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL)
        .then((signature) => provider.connection.confirmTransaction(signature)),
    );
    await Promise.all(airdropPromises);
  }

  async function initializePlatform() {
    const tx = await program.methods
      .initialize("deserhub", listingFeeBps)
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
    expect(platformState.name).to.equal("deserhub");
    console.log("Initialize platform transaction signature", tx);
  }

  // Helper functions for paper creation
  async function expectErrorOnInvalidFee() {
    try {
      await program.methods
        .initialize(crypto.randomUUID(), 801)
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

  async function createPaperSuccessfully() {
    const initialTreasuryBalance = await provider.connection.getBalance(
      treasuryPda,
    );
    const paperEntry = anchor.web3.Keypair.generate();
    const paperPrice = new anchor.BN(1000000000); // 1 SOL in lamports

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

    console.log("Create paper transaction signature", tx);
  }

  async function createOpenAccessPaper() {
    const initialTreasuryBalance = await provider.connection.getBalance(
      treasuryPda,
    );
    const paperEntry = anchor.web3.Keypair.generate();

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
    expect(paperState.isOpenAccess).to.be.true;
    expect(paperState.price.eq(new anchor.BN(0))).to.be.true;

    const treasuryBalance = await provider.connection.getBalance(treasuryPda);
    expect(treasuryBalance).to.equal(initialTreasuryBalance);

    console.log("Create open access paper transaction signature", tx);
  }

  async function expectErrorOnInvalidOpenAccessPaper() {
    const paperEntry = anchor.web3.Keypair.generate();
    try {
      await program.methods
        .createPaper(
          "Invalid Open Access",
          "Description",
          "https://example.com/invalid",
          true,
          new anchor.BN(100000000),
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
      expect.fail("Expected an error to be thrown");
    } catch (error) {
      expect(error.toString()).to.match(/Invalid price/i);
    }
  }
});
