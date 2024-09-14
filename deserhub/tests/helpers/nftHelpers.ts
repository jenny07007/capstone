import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Deserhub } from "../../target/types/deserhub";
import { expect } from "chai";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
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

export async function mintNftAndUpdatePaperAccessPass(
  program: Program<Deserhub>,
  provider: anchor.AnchorProvider,
  mint: anchor.web3.Keypair,
  owner_keypair: anchor.web3.Keypair,
  paperEntry: anchor.web3.Keypair,
  paperAccessPassPda: anchor.web3.PublicKey,
  platformPda: anchor.web3.PublicKey,
) {
  const umi = createUmi("http://127.0.0.1:8899")
    .use(mplTokenMetadata())
    .use(walletAdapterIdentity(owner_keypair));

  // get owner's ata
  const owner_ata = await getAssociatedTokenAddress(
    mint.publicKey,
    owner_keypair.publicKey,
  );

  // find metadata and master edition accounts
  let [metadataAccount] = findMetadataPda(umi, {
    mint: umi_publicKey(mint.publicKey),
  });
  let [masterEditionAccount] = findMasterEditionPda(umi, {
    mint: umi_publicKey(mint.publicKey),
  });

  // get paper access pass account before minting
  const openAccessPaperEntryAccountBefore =
    await program.account.paperAccessPass.fetch(paperAccessPassPda);

  expect(openAccessPaperEntryAccountBefore.mint).is.null;

  const ownerBalanceBefore = await provider.connection.getBalance(
    owner_keypair.publicKey,
  );

  console.log("Owner balance before: ", ownerBalanceBefore / LAMPORTS_PER_SOL);

  const nftName = "DeSerhubPass";
  const nftSymbol = "DSH";
  const nftUri = "https://example.com/nft.json";

  // Mint NFT
  const tx = await program.methods
    .mintNft(nftName, nftSymbol, nftUri)
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

  // check if the nftCounter is incremented
  const platformState = await program.account.platform.fetch(platformPda);
  console.log(
    "Platform nftCounter after minting: ",
    platformState.nftCounter.toString(),
  );

  const metadataAccountInfo = await provider.connection.getAccountInfo(
    new anchor.web3.PublicKey(metadataAccount),
  );

  // check if the metadata nft counter is correct
  expect(metadataAccountInfo?.data.toString()).to.contain(
    `${nftName} ${formatNftNumber(platformState.nftCounter.toNumber())}`,
  );

  // get paper access pass account after minting
  const ownerBalanceAfter = await provider.connection.getBalance(
    owner_keypair.publicKey,
  );

  expect(ownerBalanceAfter).is.lessThan(ownerBalanceBefore);
  console.log("Owner balance after: ", ownerBalanceAfter / LAMPORTS_PER_SOL);

  // check if master edition account is created
  const masterEditionAccountInfo = await provider.connection.getAccountInfo(
    new anchor.web3.PublicKey(masterEditionAccount),
  );
  expect(masterEditionAccountInfo).is.not.null;
  expect(masterEditionAccountInfo!.data.length).is.greaterThan(0);

  // check if owner ATA is created
  const ownerAtaInfo = await provider.connection.getParsedAccountInfo(
    owner_ata,
  );
  expect(ownerAtaInfo.value).is.not.null;

  // check if the owner ATA has the parsed data
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

// format the nft number to 4 digits
export function formatNftNumber(number: number): string {
  return number < 1000
    ? `#${number.toString().padStart(4, "0")}`
    : `#${number}`;
}
