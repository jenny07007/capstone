use anchor_lang::{
    prelude::*,
    system_program::{transfer, Transfer},
};

use crate::{
    error::DeSerHubError,
    states::{PaperEntry, Platform},
};

#[derive(Accounts)]
pub struct CreatePaper<'info> {
    #[account(mut)]
    pub researcher: Signer<'info>,

    #[account(
        init,
        payer = researcher,
        space = 8 + PaperEntry::INIT_SPACE,
    )]
    pub paper_entry: Account<'info, PaperEntry>,

    #[account(
        seeds = [b"platform", platform.admin.key().as_ref()],
        bump = platform.bump,
    )]
    pub platform: Account<'info, Platform>,

    #[account(
        mut,
        seeds = [b"treasury", platform.key().as_ref(), platform.admin.key().as_ref()],
        bump = platform.treasury_bump,
    )]
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

impl<'info> CreatePaper<'info> {
    // we need to check if the paper is open access or not
    // if it is, we need to set the price to 0 and not charge the listing fee from the researcher
    // otherwise, we need to check if the researcher has enough balance to pay for listing fee
    // then we need to transfer the balance from the researcher to the treasury
    // finally, we need to set the paper entry
    pub fn create_paper(
        &mut self,
        title: String,
        description: String,
        uri: String, // encrypted pdf link
        is_open_access: bool,
        price: u64,
    ) -> Result<()> {
        require!(!title.is_empty(), DeSerHubError::EmptyTitle);
        require!(!description.is_empty(), DeSerHubError::EmptyDescription);
        require!(!uri.is_empty(), DeSerHubError::EmptyUri);
        require!(price > 0 || is_open_access, DeSerHubError::InvalidPrice);
        require!(!is_open_access || price == 0, DeSerHubError::InvalidPrice);

        require!(
            title.len() > 0 && title.len() <= 300,
            DeSerHubError::TitleTooLong
        );
        require!(
            description.len() > 0 && description.len() <= 500,
            DeSerHubError::DescriptionTooLong
        );
        require!(
            uri.len() > 0 && uri.len() <= 66,
            DeSerHubError::UriTooLongOrNull
        );

        // transfer the listing fee from the researcher to the treasury
        let accounts = Transfer {
            from: self.researcher.to_account_info(),
            to: self.treasury.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(self.system_program.to_account_info(), accounts);

        match is_open_access {
            true => self.paper_entry.price = 0,
            false => {
                let amount_pay_for_listing =
                    (price * self.platform.listing_fee_bps as u64) / 10_000;
                require!(
                    self.researcher.lamports() >= amount_pay_for_listing,
                    DeSerHubError::InsufficientBalanceForListing
                );
                transfer(cpi_ctx, amount_pay_for_listing)?;
            }
        }

        self.paper_entry.set_inner(PaperEntry {
            researcher: self.researcher.key(),
            title: title.clone(),
            description,
            uri,
            price,
            is_open_access,
            created_at: Clock::get()?.unix_timestamp as i64,
        });

        msg!(
            "Paper Created: {}",
            self.paper_entry.to_account_info().key()
        );

        emit!(PaperCreated {
            researcher: self.researcher.key(),
            paper_entry: self.paper_entry.key(),
            title,
            is_open_access,
            price,
        });

        Ok(())
    }
}

#[event]
pub struct PaperCreated {
    pub researcher: Pubkey,
    pub paper_entry: Pubkey,
    pub title: String,
    pub is_open_access: bool,
    pub price: u64,
}
