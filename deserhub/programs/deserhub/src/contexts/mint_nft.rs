use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, TokenAccount, TokenInterface},
};
use mpl_token_metadata::accounts::{MasterEdition, Metadata};

use crate::states::{PaperAccessPass, PaperEntry, Platform};

#[derive(Accounts)]
pub struct MintNft<'info> {
    #[account(mut)]
    // the reader paying for the paper
    pub owner: Signer<'info>,

    #[account(
			init,
			payer = owner,
			mint::decimals = 0,
			mint::authority = platform.key(),
			mint::freeze_authority = platform.key(),
		)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    // the paper listing on platform
    pub paper_entry: Account<'info, PaperEntry>,

    #[account(
			mut,
			seeds = [b"paper_access_pass", owner.key().as_ref(), paper_entry.key().as_ref()],
			bump,
		)]
    pub paper_access_pass: Account<'info, PaperAccessPass>,

    #[account(
			init_if_needed,
			payer = owner,
			associated_token::mint = mint,
			associated_token::authority = owner,
		)]
    pub owner_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    ///CHECK: this is derived from the mint and its pda, it's safe to use.
    #[account(
			mut,
			address = Metadata::find_pda(&mint.key()).0,
		)]
    pub metadata: UncheckedAccount<'info>,

    ///CHECK: this is derived from the mint and its pda, it's safe to use.
    #[account(
			mut,
			address = MasterEdition::find_pda(&mint.key()).0,
		)]
    pub master_edition: UncheckedAccount<'info>,

    #[account(
			seeds = [b"platform", platform.admin.key().as_ref()],
			bump = platform.bump,
		)]
    pub platform: Account<'info, Platform>,

    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
}

impl<'info> MintNft<'info> {
    pub fn mint_nft(&self) -> Result<()> {
        Ok(())
    }
}
