import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../target/types/deserhub";
import { expect } from "chai";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
} from "@solana/spl-token";
import {
  findMetadataPda,
  findMasterEditionPda,
  MPL_TOKEN_METADATA_PROGRAM_ID,
  mplTokenMetadata,
} from "@metaplex-foundation/mpl-token-metadata";
import { publicKey as umi_publicKey } from "@metaplex-foundation/umi";
import { createUmi } from "@metaplex-foundation/umi-bundle-defaults";
import { walletAdapterIdentity } from "@metaplex-foundation/umi-signer-wallet-adapters";

describe("Deserhub", () => {
  // Setup
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program = anchor.workspace.Deserhub as Program<Deserhub>;

  // Wallets and Constants
  const admin_wallet = anchor.web3.Keypair.generate();
  const researcher_keypair = anchor.web3.Keypair.generate();
  const owner_keypair = anchor.web3.Keypair.generate();
  const mint = anchor.web3.Keypair.generate();
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

  describe("\n---------------- Platform Initialization 🚀 ----------------", () => {
    it("should init platform", async () => {
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

  describe("\n---------------- Mint NFT 🍉 ----------------", async () => {
    it("should mint NFT and update paper access pass correctly", async () => {
      await mintNftAndUpdatePaperAccessPass();
    });

    it("should verify the NFT is correctly associated with the Paper Entry and Paper Access Pass", async () => {});
  });

  /********************************************
                Helper functions
   ********************************************/

  /*
    Helper functions for platform initialization
  */
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

  /*
    Helper functions for paper creation
  */

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

  /*
    Helper functions for paper entry creation (listing a paper)
  */

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

  /*
    Helper functions for paper creation error scenarios
  */

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

  /*
    No payment for open access paper
  */

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

    console.log(
      `Final Owner Balance: ${finalOwnerBalance / LAMPORTS_PER_SOL} SOL`,
    );
  }

  /*
    Mint NFT and update Paper Access Pass
  */

  async function mintNftAndUpdatePaperAccessPass() {
    const umi = createUmi("http://127.0.0.1:8899")
      .use(mplTokenMetadata())
      .use(walletAdapterIdentity(owner_keypair));

    // get associated token address
    const owner_ata = await getAssociatedTokenAddress(
      mint.publicKey,
      owner_keypair.publicKey,
    );

    // find metadata and master edition accounts
    let metadataAccount = findMetadataPda(umi, {
      mint: umi_publicKey(mint.publicKey),
    })[0];
    let masterEditionAccount = findMasterEditionPda(umi, {
      mint: umi_publicKey(mint.publicKey),
    })[0];

    // get paper access pass account before minting
    const openAccessPaperEntryAccountBefore =
      await program.account.paperAccessPass.fetch(paperAccessPassPda);

    expect(openAccessPaperEntryAccountBefore.mint).is.null;

    const ownerBalanceBefore = await provider.connection.getBalance(
      owner_keypair.publicKey,
    );

    console.log(
      "Owner balance before: ",
      ownerBalanceBefore / LAMPORTS_PER_SOL,
    );

    // mint NFT
    const tx = await program.methods
      .mintNft("Test NFT", "TEST", "https://example.com/nft.json")
      .accountsStrict({
        owner: owner_keypair.publicKey,
        mint: mint.publicKey,
        paperEntry: paperEntry.publicKey,
        paperAccessPass: paperAccessPassPda,
        ownerAta: owner_ata,
        metadata: metadataAccount,
        masterEdition: masterEditionAccount,
        platform: platformPda,
        tokenProgram: TOKEN_PROGRAM_ID,
        associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        tokenMetadataProgram: MPL_TOKEN_METADATA_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
        rent: anchor.web3.SYSVAR_RENT_PUBKEY,
      })
      .signers([owner_keypair, mint])
      .rpc();
    console.log(`Mint NFT transaction signature: ${tx}`);

    // get paper access pass account after minting
    const ownerBalanceAfter = await provider.connection.getBalance(
      owner_keypair.publicKey,
    );

    expect(ownerBalanceAfter).is.lessThan(ownerBalanceBefore);
    console.log("Owner balance after: ", ownerBalanceAfter / LAMPORTS_PER_SOL);

    // check if master edition account is created
    const masterEditionAccountInfo = await provider.connection.getAccountInfo(
      new PublicKey(masterEditionAccount),
    );
    expect(masterEditionAccountInfo).is.not.null;
    expect(masterEditionAccountInfo!.data.length).is.greaterThan(0);

    // check if owner ata is created
    const ownerAtaInfo = await provider.connection.getParsedAccountInfo(
      owner_ata,
    );
    expect(ownerAtaInfo.value).is.not.null;

    // check if the owner ata has the parsed data
    if ("parsed" in ownerAtaInfo.value.data) {
      const ataData = ownerAtaInfo.value.data.parsed.info;
      expect(ataData.mint).to.equal(mint.publicKey.toBase58());
      expect(ataData.owner).to.equal(owner_keypair.publicKey.toBase58());
    } else {
      expect.fail("Parsed ATA data is not expected format");
    }

    // check if the paper access pass is updated with the mint correctly
    const paperAccessPassAccountData =
      await program.account.paperAccessPass.fetch(paperAccessPassPda);
    expect(paperAccessPassAccountData.mint).is.not.null;
    expect(paperAccessPassAccountData.mint.toBase58()).to.equal(
      mint.publicKey.toBase58(),
    );

    // log paper access pass account data
    console.log("Paper Access Pass After minting: ", {
      mint: paperAccessPassAccountData.mint.toBase58(),
      paperEntry: paperAccessPassAccountData.paperEntry.toBase58(),
      owner: paperAccessPassAccountData.owner.toBase58(),
      price: Number(paperAccessPassAccountData.price) / LAMPORTS_PER_SOL,
      purchasedAt: new Date(
        paperAccessPassAccountData.purchasedAt.toNumber() * 1000,
      ).toISOString(),
    });
  }
});
