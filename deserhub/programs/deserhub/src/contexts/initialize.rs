use anchor_lang::prelude::*;
use anchor_spl::token_interface::TokenInterface;

use crate::{error::DeSerHubError, states::Platform};

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
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> Initialize<'info> {
    pub fn init_platform(
        &mut self,
        name: String,
        listing_fee_bps: u16,
        bumps: &InitializeBumps,
    ) -> Result<()> {
        require!(name.len() <= 32, DeSerHubError::NameTooLong);

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
