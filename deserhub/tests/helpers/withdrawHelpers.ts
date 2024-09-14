import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../../target/types/deserhub";
import { expect } from "chai";

export async function withdrawTreasuryFunds(
  program: Program<Deserhub>,
  provider: anchor.AnchorProvider,
  admin_wallet: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
) {
  const withdrawAmount = new anchor.BN(50e9);
  const adminBalanceBefore = await provider.connection.getBalance(
    admin_wallet.publicKey,
  );
  const treasuryBalanceBefore = await provider.connection.getBalance(
    treasuryPda,
  );

  try {
    const tx = await program.methods
      .withdraw(withdrawAmount)
      .accountsStrict({
        admin: admin_wallet.publicKey,
        platform: platformPda,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin_wallet])
      .rpc();

    console.log("Withdraw SOL signature", tx);

    const adminBalanceAfter = await provider.connection.getBalance(
      admin_wallet.publicKey,
    );
    const treasuryBalanceAfter = await provider.connection.getBalance(
      treasuryPda,
    );

    console.log("Admin balance after:", adminBalanceAfter);
    console.log("Treasury balance after:", treasuryBalanceAfter);

    expect(adminBalanceAfter).to.be.above(adminBalanceBefore);
    expect(treasuryBalanceAfter).to.equal(
      treasuryBalanceBefore - withdrawAmount.toNumber(),
    );
  } catch (error: any) {
    console.error("Withdraw failed:", error);
    if (error.logs) console.error("Logs:", error.logs);
    throw error;
  }
}

export async function expectErrorOnExcessiveWithdrawal(
  program: Program<Deserhub>,
  admin_wallet: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
) {
  const excessiveAmount = new anchor.BN(1000e9);

  try {
    await program.methods
      .withdraw(excessiveAmount)
      .accountsStrict({
        admin: admin_wallet.publicKey,
        platform: platformPda,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin_wallet])
      .rpc();
    expect.fail("The transaction should have failed");
  } catch (error) {
    expect(error.toString()).to.match(/InsufficientBalanceForWithdraw/i);
  }
}

export async function expectErrorOnBelowThresholdWithdrawal(
  program: Program<Deserhub>,
  provider: anchor.AnchorProvider,
  admin_wallet: anchor.web3.Keypair,
  platformPda: anchor.web3.PublicKey,
  treasuryPda: anchor.web3.PublicKey,
) {
  const treasuryBalance = await provider.connection.getBalance(treasuryPda);
  const withdrawAmount = new anchor.BN(49e9);

  console.log("Treasury balance:", treasuryBalance);
  console.log("Attempting to withdraw amount:", withdrawAmount.toNumber());

  try {
    await program.methods
      .withdraw(withdrawAmount)
      .accountsStrict({
        admin: admin_wallet.publicKey,
        platform: platformPda,
        treasury: treasuryPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([admin_wallet])
      .rpc();
    expect.fail("The transaction should have failed");
  } catch (error) {
    expect(error.toString()).to.match(/WithdrawalBelowMinimumThreshold/i);
  }
}
