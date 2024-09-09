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
  const owner_keypair = anchor.web3.Keypair.generate();
  const listingFeeBps = 800;
  const paperEntry = anchor.web3.Keypair.generate();

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

  // paper access pass for testing. And for NFT minting
  const [paperAccessPassPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [
      Buffer.from("paper_access_pass"),
      owner_keypair.publicKey.toBuffer(),
      paperEntry.publicKey.toBuffer(),
    ],
    program.programId,
  );

  before(async () => {
    await airdropToWallets([admin_wallet, researcher_keypair, owner_keypair]);
  });

  /********************************************
                    Tests 
   ********************************************/

  describe("\n---------------- Platform Initialization ----------------", () => {
    it("should init platform 🚀", async () => {
      await initializePlatform();
    });

    // This will fail if the platform is already initialized ⬆︎
    it.skip("should throw error when fee is greater than 800 bps", async () => {
      await expectErrorOnInvalidFee();
    });
  });

  describe("\n---------------- Create Paper Entry 🧬 ----------------", () => {
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

  describe("\n---------------- Pay for Paper Access Pass 🤑 ----------------", () => {
    it("should successfully pay for a paper access pass", async () => {
      await payForPaperAccessPassSuccessfully();
    });

    it("should create a free access pass for open access papers without payment", async () => {
      await noPaymentForOpenAccessPaper();
    });
  });

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

    console.log(`Initialize platform transaction signature: ${tx}`);
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

    console.log(
      `Paper entry price: ${
        paperState.price.toNumber() / LAMPORTS_PER_SOL
      } SOL`,
    );
    console.log(`Treasury balance: ${treasuryBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Create paper transaction signature: ${tx}`);
  }

  async function createOpenAccessPaper() {
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
      `Paper entry price: ${
        paperState.price.toNumber() / LAMPORTS_PER_SOL
      } SOL`,
    );
    console.log(`Treasury balance: ${treasuryBalance / LAMPORTS_PER_SOL} SOL`);
    console.log(`Create open access paper transaction signature: ${tx}`);
  }

  async function expectErrorOnInvalidOpenAccessPaper() {
    const openAccessPaperEntry = anchor.web3.Keypair.generate();
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

  async function payForPaperAccessPassSuccessfully() {
    const paperEntryData = await program.account.paperEntry.fetch(
      paperEntry.publicKey,
    );

    // Get researcher's initial balance
    const initialResearcherBalance = await provider.connection.getBalance(
      paperEntryData.researcher,
    );

    const purchased_at = new anchor.BN(Date.now() / 1000); // in seconds

    const tx = await program.methods
      .payPass(purchased_at)
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
    expect(paperAccessPassState.purchasedAt.toString()).to.equal(
      purchased_at.toString(),
    );
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

    // Check if the researcher's balance has increased by the paper entry price
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

  async function noPaymentForOpenAccessPaper() {
    // Create an open access paper
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

    // Get the initial balance of the owner
    const initialOwnerBalance = await provider.connection.getBalance(
      owner_keypair.publicKey,
    );

    // Generate PDA for paper access pass
    const [openAccessPassPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("paper_access_pass"),
        owner_keypair.publicKey.toBuffer(),
        openAccessPaperEntry.publicKey.toBuffer(),
      ],
      program.programId,
    );

    const purchased_at = new anchor.BN(Date.now() / 1000); // in seconds

    // Try to pay for the access pass (which should be free)
    await program.methods
      .payPass(purchased_at)
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

    // Check if the paper access pass was created
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

    expect(paperAccessPassState.owner.toBase58()).to.equal(
      owner_keypair.publicKey.toBase58(),
    );
    expect(paperAccessPassState.paperEntry.toBase58()).to.equal(
      openAccessPaperEntry.publicKey.toBase58(),
    );
    expect(paperAccessPassState.price.toNumber()).to.equal(0);
    expect(paperAccessPassState.purchasedAt.toString()).to.equal(
      purchased_at.toString(),
    );
    expect(paperAccessPassState.mint).to.be.null;

    // Verify that the owner's balance hasn't changed
    const finalOwnerBalance = await provider.connection.getBalance(
      owner_keypair.publicKey,
    );

    // Check if the rent exemption amount is subtracted from the owner's balance
    expect(finalOwnerBalance).to.equal(
      initialOwnerBalance - rentExemptionAmount,
    );
  }
});
