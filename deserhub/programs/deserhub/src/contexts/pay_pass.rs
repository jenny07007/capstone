use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{
    error::DeSerHubError,
    states::{PaperAccessPass, PaperEntry, Platform},
};

#[derive(Accounts)]
pub struct PayPass<'info> {
    #[account(mut)]
    pub owner: Signer<'info>,

    // the paper listing on platform
    pub paper_entry: Account<'info, PaperEntry>,

    // we'll assign the nft to the pass that associated with the paper entry
    #[account(
        init,
        payer = owner,
        space = 8 + PaperAccessPass::INIT_SPACE,
        seeds = [b"paper_access_pass", owner.key().as_ref(), paper_entry.key().as_ref()],
        bump,
    )]
    pub paper_access_pass: Account<'info, PaperAccessPass>,

    #[account(
			seeds = [b"platform", platform.admin.key().as_ref()],
			bump = platform.bump,
		)]
    pub platform: Account<'info, Platform>,

    // researcher has paid the listing fee
    #[account(mut)]
    pub researcher: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> PayPass<'info> {
    pub fn pay_pass(&mut self) -> Result<()> {
        let paper_entry = &self.paper_entry;
        let purchased_at = Clock::get()?.unix_timestamp as i64;

        // check the provided researcher is the owner of the paper
        require!(
            self.researcher.key() == paper_entry.researcher,
            DeSerHubError::PayPassInvalidResearcher
        );

        let price = paper_entry.price;

        if !paper_entry.is_open_access {
            require!(
                self.owner.lamports() > price,
                DeSerHubError::InsufficientBalanceForListing
            );
            let accounts = Transfer {
                from: self.owner.to_account_info(),
                to: self.researcher.to_account_info(),
            };
            let cpi_ctx = CpiContext::new(self.system_program.to_account_info(), accounts);
            transfer(cpi_ctx, price)?;
        }

        self.paper_access_pass.set_inner(PaperAccessPass {
            mint: None, // we'll mint the nft later
            paper_entry: self.paper_entry.key(),
            owner: self.owner.key(),
            price,
            bump: self.platform.bump,
            purchased_at,
        });

        msg!(
            "Paper Access Pass Created: {}",
            self.paper_access_pass.key()
        );

        emit!(PaperAccessPassCreated {
            paper_entry: self.paper_entry.key(),
            paper_access_pass: self.paper_access_pass.key(),
            owner: self.owner.key(),
            price: self.paper_entry.price,
            purchased_at,
        });
        Ok(())
    }
}

#[event]
pub struct PaperAccessPassCreated {
    pub paper_entry: Pubkey,
    pub paper_access_pass: Pubkey,
    pub owner: Pubkey,
    pub price: u64,
    pub purchased_at: i64,
}
