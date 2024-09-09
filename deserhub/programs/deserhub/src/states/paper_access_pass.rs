use anchor_lang::prelude::*;

// TODO: considering multiple NFTs and entries per pass
#[account]
#[derive(InitSpace)]
pub struct PaperAccessPass {
    pub mint: Option<Pubkey>, // the nft linked to this pass. it's optional because the reader pay pass first before minting the nft
    pub paper_entry: Pubkey,  // the paper entry linked to this pass,
    pub owner: Pubkey,        // the owner of the pass
    pub price: u64,
    pub bump: u8,
    pub purchased_at: i64,
}
