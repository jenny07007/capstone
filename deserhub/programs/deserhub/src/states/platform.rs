use anchor_lang::prelude::*;

//  Singleton for the entire application
#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub admin: Pubkey,
    pub listing_fee_bps: u16, // listing fee in basis points (250 = 2.5%)
    pub bump: u8,
    pub treasury_bump: u8,
    #[max_len(20)]
    pub name: String,
    pub nft_counter: u64, // counter for nfts minted for this paper
}
