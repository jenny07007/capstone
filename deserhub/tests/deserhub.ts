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

import {
  initializePlatform,
  expectErrorOnInvalidFee,
  expectErrorOnInvalidNameLength,
} from "./helpers/platformHelpers";
import {
  createOpenAccessPaper,
  createPaidAccessPaper,
  expectErrorOnInvalidOpenAccessPaper,
} from "./helpers/paperHelpers";
import { mintNftAndUpdatePaperAccessPass } from "./helpers/nftHelpers";
import {
  noPaymentForOpenAccessPaper,
  payForPaperAccessPassSuccessfully,
} from "./helpers/paymentHelpers";

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
      await initializePlatform(
        program,
        admin_wallet,
        platformPda,
        treasuryPda,
        listingFeeBps,
      );
    });

    // This will fail if the platform id is already exists ⬆︎
    it.skip("should throw error when fee is greater than 800 bps", async () => {
      await expectErrorOnInvalidFee(
        program,
        admin_wallet,
        platformPda,
        treasuryPda,
      );
    });
    // This will fail if the platform id is already exists ⬆︎
    it.skip("should throw error when name length is greater than 20 characters", async () => {
      await expectErrorOnInvalidNameLength(
        program,
        admin_wallet,
        platformPda,
        treasuryPda,
      );
    });
  });

  describe("\n---------------- Create Paper Entry 🧬 ----------------", () => {
    it("should create a paid access paper entry successfully", async () => {
      await createPaidAccessPaper(
        program,
        provider,
        platformPda,
        paperEntry,
        researcher_keypair,
        treasuryPda,
        listingFeeBps,
      );
    });

    it("should not charge a fee when the paper is open access", async () => {
      await createOpenAccessPaper(
        program,
        provider,
        platformPda,
        researcher_keypair,
        treasuryPda,
      );
    });

    it("should throw an error when open access is true but the price is greater than 0", async () => {
      await expectErrorOnInvalidOpenAccessPaper(
        program,
        researcher_keypair,
        platformPda,
        treasuryPda,
      );
    });
  });

  describe("\n---------------- Pay for Paper Access Pass 🤑 ----------------", () => {
    it("should successfully pay for a paper's access pass", async () => {
      await payForPaperAccessPassSuccessfully(
        program,
        provider,
        paperEntry,
        owner_keypair,
        platformPda,
      );
    });

    it("should create a free access pass for open-access papers without requiring payment", async () => {
      await noPaymentForOpenAccessPaper(
        program,
        provider,
        researcher_keypair,
        owner_keypair,
        platformPda,
        treasuryPda,
      );
    });
  });

  describe("\n---------------- Mint NFT 🍉 ----------------", async () => {
    it("should mint an NFT and update the paper access pass correctly", async () => {
      await mintNftAndUpdatePaperAccessPass(
        program,
        provider,
        mint,
        owner_keypair,
        paperEntry,
        paperAccessPassPda,
        platformPda,
      );
    });

    it("should verify the NFT is correctly associated with the Paper Entry and Paper Access Pass", async () => {});
  });

  /*
    airdrop to wallets
  */
  async function airdropToWallets(wallets: anchor.web3.Keypair[]) {
    const airdropPromises = wallets.map((wallet) =>
      provider.connection
        .requestAirdrop(wallet.publicKey, 2 * LAMPORTS_PER_SOL)
        .then((signature) => provider.connection.confirmTransaction(signature)),
    );
    await Promise.all(airdropPromises);
  }
});
