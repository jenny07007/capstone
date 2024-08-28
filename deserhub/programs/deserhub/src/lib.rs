use anchor_lang::prelude::*;

declare_id!("9XeszLgbhWuATMavuNkRDP4KPx7aqFugmGTdcP5WuuQX");

#[program]
pub mod deserhub {
    use super::*;

    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        msg!("Greetings from: {:?}", ctx.program_id);
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize {}
