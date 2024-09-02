use anchor_lang::prelude::*;

declare_id!("9XeszLgbhWuATMavuNkRDP4KPx7aqFugmGTdcP5WuuQX");

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
}
