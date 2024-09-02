use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Listing {
    pub author: Pubkey,
    pub mint: Pubkey, // TODO: may change to compressed_pda_root [u8; 32],
    pub price: u64,
    pub bump: u8,
    pub is_open_access: bool,
    pub access_fee: u64,
}
