use anchor_lang::prelude::*;

// One per uploaded PDF/NFT
#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub author: Pubkey,
    pub mint: Pubkey, // identify which nft is being listed
    pub price: u64,
    pub bump: u8,
    pub is_open_access: bool,
    pub created_at: i64,
}
