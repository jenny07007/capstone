use anchor_lang::prelude::*;

use crate::{error::DeSerHubError, states::Platform};

pub const MAX_LISTING_FEE_BPS: u16 = 800; // 8%

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

    // may use token program in the future for holding tokens
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
        // we check if the platform name is valid and the listing fee is within the limit
        require!(
            name.len() > 0 && name.len() <= 20,
            DeSerHubError::InvalidNameLength
        );
        require!(
            listing_fee_bps <= MAX_LISTING_FEE_BPS, // 0 ~ 8%
            DeSerHubError::InvalidListingFee
        );

        self.platform.set_inner(Platform {
            admin: self.admin.key(),
            listing_fee_bps, // fee goes to platform
            bump: bumps.platform,
            treasury_bump: bumps.treasury,
            name: name.clone(),
        });

        msg!("Initialized platform {}", name);

        emit!(PlatformInitialized {
            name,
            listing_fee_bps,
        });

        Ok(())
    }
}

#[event]
pub struct PlatformInitialized {
    pub name: String,
    pub listing_fee_bps: u16,
}
