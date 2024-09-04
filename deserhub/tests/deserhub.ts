import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../target/types/deserhub";
import { expect } from "chai";

describe("deserhub", async () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const my_dev_wallet = provider.wallet as anchor.Wallet;

  const program = anchor.workspace.Deserhub as Program<Deserhub>;

  const [platformPda, platformBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("platform"), my_dev_wallet.publicKey.toBuffer()],
      program.programId,
    );

  const [treasuryPda, treasuryBump] =
    anchor.web3.PublicKey.findProgramAddressSync(
      [
        Buffer.from("treasury"),
        platformPda.toBuffer(),
        my_dev_wallet.publicKey.toBuffer(),
      ],
      program.programId,
    );

  describe("Platform initialization", () => {
    it.skip("should init platform 🚀", async () => {
      const tx = await program.methods
        .initialize("deserhub", 500)
        .accountsStrict({
          admin: my_dev_wallet.publicKey,
          platform: platformPda,
          treasury: treasuryPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([my_dev_wallet.payer])
        .rpc();

      const platformState = await program.account.platform.fetch(platformPda);
      expect(platformState.listingFeeBps).to.equal(500);
      expect(platformState.name).to.equal("deserhub");

      // console.log(`https://explorer.solana.com/tx/${tx}?cluster=devnet`);
      console.log("transaction signature", tx);
    });

    it("should throw error when fee is greater than 500 bps", async () => {
      try {
        await program.methods
          .initialize("deserhub", 501)
          .accountsStrict({
            admin: my_dev_wallet.publicKey,
            platform: platformPda,
            treasury: treasuryPda,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([my_dev_wallet.payer])
          .rpc();

        expect.fail("Expected an error to be thrown");
      } catch (error) {
        expect(error.toString()).to.match(/Invalid listing fee/i);
      }
    });
  });
});
