use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{error::DeSerHubError, states::Platform};

#[derive(Accounts)]
pub struct Withdraw<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,

    #[account(
        seeds = [b"platform", admin.key().as_ref()],
        bump,
	)]
    pub platform: Account<'info, Platform>,

    #[account(
        mut,
        seeds = [b"treasury", platform.key().as_ref(), admin.key().as_ref()],
        bump,
        constraint = platform.admin.key() == admin.key()
	)]
    pub treasury: SystemAccount<'info>,
    pub system_program: Program<'info, System>,
}

impl<'info> Withdraw<'info> {
    pub fn withdraw(&mut self, amount: u64) -> Result<()> {
        if amount < 50_000_000_000 || self.treasury.lamports() < 50_000_000_000 {
            return Err(DeSerHubError::WithdrawalBelowMinimumThreshold.into());
        }
        if self.treasury.lamports() < amount {
            return Err(DeSerHubError::InsufficientBalanceForWithdraw.into());
        }

        let accounts = Transfer {
            from: self.treasury.to_account_info(),
            to: self.admin.to_account_info(),
        };

        let admin_key = self.admin.key();
        let platform_key = self.platform.key();

        let seeds = &[
            b"treasury",
            platform_key.as_ref(),
            admin_key.as_ref(),
            &[self.platform.treasury_bump],
        ];
        let signer_seeds = &[&seeds[..]];

        let cpi_ctx = CpiContext::new_with_signer(
            self.system_program.to_account_info(),
            accounts,
            signer_seeds,
        );
        transfer(cpi_ctx, amount)
    }
}
