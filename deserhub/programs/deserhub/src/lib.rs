use anchor_lang::prelude::*;

declare_id!("J4BSb2jYCnLsxAiaEeVktKfSjbAwUiDV8X5KzFhqkR2T");

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

    pub fn create_paper(
        ctx: Context<CreatePaper>,
        title: String,
        description: String,
        uri: String,
        is_open_access: bool,
        price: u64,
    ) -> Result<()> {
        ctx.accounts
            .create_paper(title, description, uri, is_open_access, price)
    }

    pub fn pay_pass(ctx: Context<PayPass>) -> Result<()> {
        ctx.accounts.pay_pass()
    }

    pub fn mint_nft(
        ctx: Context<MintNft>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        ctx.accounts.mint_nft(name, symbol, uri)
    }

    pub fn withdraw(ctx: Context<Withdraw>, amount: u64) -> Result<()> {
        ctx.accounts.withdraw(amount)
    }
}
