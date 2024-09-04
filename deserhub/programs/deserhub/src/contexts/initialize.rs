use anchor_lang::prelude::*;

use crate::{error::DeSerHubError, states::Platform};

pub const MAX_LISTING_FEE_BPS: u16 = 500;

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(
        init,
        seeds = [b"platform", admin.key().as_ref()],
        bump,
        payer = admin,
        space = 8 + Platform::INIT_SPACE,
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        seeds = [b"treasury", platform.key().as_ref(), admin.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn init_platform(
        &mut self,
        name: String,
        listing_fee_bps: u16,
        bumps: &InitializeBumps,
    ) -> Result<()> {
        require!(
            name.len() > 0 && name.len() <= 32,
            DeSerHubError::InvalidNameLength
        );
        require!(
            listing_fee_bps <= MAX_LISTING_FEE_BPS, // 0 ~ 5%,
            DeSerHubError::InvalidListingFee
        );

        self.platform.set_inner(Platform {
            admin: self.admin.key(),
            listing_fee_bps, // fee goes to platform
            bump: bumps.platform,
            treasury_bump: bumps.treasury,
            name,
        });
        Ok(())
    }
}
