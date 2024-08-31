use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Platform {
    pub admin: Pubkey,
    pub listing_fee_bps: u16, // listing fee in basis points (250 = 2.5%)
    pub bump: u8,
    pub treasury_bump: u8,
    #[max_len(32+4)]
    pub name: String,
}
