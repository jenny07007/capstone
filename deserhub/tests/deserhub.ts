import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../target/types/deserhub";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";

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
import {
  mintNftAndUpdatePaperAccessPass,
  verifyNftOwnership,
} from "./helpers/nftHelpers";
import {
  noPaymentForOpenAccessPaper,
  payForPaperAccessPass,
} from "./helpers/paymentHelpers";
import { expect } from "chai";
import {
  withdrawTreasuryFunds,
  expectErrorOnExcessiveWithdrawal,
  expectErrorOnBelowThresholdWithdrawal,
} from "./helpers/withdrawHelpers";

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
    await airdropToWallets([treasuryPda], 100 * LAMPORTS_PER_SOL);
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
      await payForPaperAccessPass(
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

    it("should verify the NFT is correctly associated with the Paper Entry and Paper Access Pass", async () => {
      await verifyNftOwnership(
        program,
        provider,
        mint,
        owner_keypair,
        paperEntry,
        paperAccessPassPda,
      );
    });

    describe("\n---------------- Withdraw Treasury Funds 💸 ----------------", () => {
      it("should successfully withdraw treasury funds", async () => {
        await withdrawTreasuryFunds(
          program,
          provider,
          admin_wallet,
          platformPda,
          treasuryPda,
        );
      });

      it("should fail when trying to withdraw more than available balance", async () => {
        await expectErrorOnExcessiveWithdrawal(
          program,
          admin_wallet,
          platformPda,
          treasuryPda,
        );
      });

      it("should fail when trying to withdraw below 50 SOL threshold", async () => {
        await expectErrorOnBelowThresholdWithdrawal(
          program,
          provider,
          admin_wallet,
          platformPda,
          treasuryPda,
        );
      });
    });
  });

  /*
    airdrop to wallets
  */
  async function airdropToWallets(
    recipients: (anchor.web3.Keypair | PublicKey)[],
    amount: number = 5 * LAMPORTS_PER_SOL,
  ) {
    const airdropPromises = recipients.map((recipient) =>
      provider.connection
        .requestAirdrop(
          recipient instanceof anchor.web3.Keypair
            ? recipient.publicKey
            : recipient,
          amount,
        )
        .then((signature) => provider.connection.confirmTransaction(signature)),
    );
    await Promise.all(airdropPromises);
  }
});
