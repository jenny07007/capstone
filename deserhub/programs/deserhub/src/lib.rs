use anchor_lang::prelude::*;

declare_id!("Bs5Vu3Yx9vAakKq2uHa8fmsPpM6CAJdTHAxJB3KZCLLY");

mod contexts;
mod states;
use contexts::*;
mod error;

#[program]
pub mod deserhub {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>, name: String, listing_fee_bps: u16) -> Result<()> {
        ctx.accounts
            .init_platform(name, listing_fee_bps, &ctx.bumps)
    }

    pub fn create_mint(
        ctx: Context<CreateMintAndListing>,
        uri: String,
        paper_name: String,
        symbol: String,
        price: u64,
        is_open_access: bool,
    ) -> Result<()> {
        ctx.accounts.create_mint_and_listing(
            uri,
            paper_name,
            symbol,
            price,
            is_open_access,
            &ctx.bumps,
        )
    }
}
