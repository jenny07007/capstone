use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    metadata::{
        create_master_edition_v3, create_metadata_accounts_v3, CreateMasterEditionV3,
        CreateMetadataAccountsV3,
        Metadata
    },
    token_interface::{mint_to, Mint, MintTo, TokenAccount, TokenInterface},  
};
use mpl_token_metadata::{
    accounts::{MasterEdition,  Metadata as MetadataAccount},
    types::DataV2,
};

use crate::{
    error::DeSerHubError,
    states::{PaperAccessPass, PaperEntry, Platform},
};

#[derive(Accounts)]
pub struct MintNft<'info> {
    #[account(mut, signer)]
    pub owner: Signer<'info>,

    #[account(
        init,
        payer = owner,
        mint::decimals = 0,
        mint::authority = platform.key(),
        mint::freeze_authority = platform.key(),   
        mint::token_program = token_program
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

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
        associated_token::authority = owner
    )]
    pub owner_ata: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: this is derived from the mint and its pda, it's safe to use.
    #[account(
        mut,
        address = MetadataAccount::find_pda(&mint.key()).0,
    )]
    pub metadata: UncheckedAccount<'info>,

    /// CHECK: this is derived from the mint and its pda, it's safe to use.
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

    pub token_metadata_program: Program<'info, Metadata>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

impl<'info> MintNft<'info> {
    pub fn mint_nft(
        &mut self,
        name: Option<String>,
        symbol: Option<String>,
        uri: String,
    ) -> Result<()> {
        let paper_access_pass = &mut self.paper_access_pass;

        // the owner of the paper access pass must be the same as the owner of the nft
        if self.owner.key() != paper_access_pass.owner {
            return Err(DeSerHubError::InvalidOwnerForCreateNft.into());
        }

        // one mint per paper access pass
        if paper_access_pass.mint.is_some() {
            return Err(DeSerHubError::NftAlreadyMintedToPaperAccessPass.into());
        }

        // create the mint
        let accounts = MintTo {
            mint: self.mint.to_account_info(),
            to: self.owner_ata.to_account_info(),
            authority: self.platform.to_account_info(),
        };

        let key = self.platform.admin.key();
        let bump = [self.platform.bump];
        let seeds = &[&[b"platform", key.as_ref(), &bump][..]];

        let cpi_ctx_mint =
            CpiContext::new_with_signer(self.token_program.to_account_info(), accounts, seeds);

        mint_to(cpi_ctx_mint, 1)?;

        // create metadata account
        let accounts: CreateMetadataAccountsV3<'_> = CreateMetadataAccountsV3 {
            metadata: self.metadata.to_account_info(),
            mint: self.mint.to_account_info(),
            mint_authority: self.platform.to_account_info(),
            payer: self.owner.to_account_info(),
            update_authority: self.platform.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: self.rent.to_account_info(),
        };

        let cpi_ctx_metadata =
            CpiContext::new_with_signer(self.token_metadata_program.to_account_info(), accounts, seeds);

        let data = DataV2 {
            name: name.unwrap_or("".to_string()),
            symbol: symbol.unwrap_or("".to_string()),
            uri,
            seller_fee_basis_points: 0,
            creators: None,
            collection: None,
            uses: None,
        };

        create_metadata_accounts_v3(cpi_ctx_metadata, data, false, true, None)?;

        // create master edition account
        let accounts = CreateMasterEditionV3 {
            edition: self.master_edition.to_account_info(),
            mint: self.mint.to_account_info(),
            update_authority: self.platform.to_account_info(),
            mint_authority: self.platform.to_account_info(),
            payer: self.owner.to_account_info(),
            metadata: self.metadata.to_account_info(),
            token_program: self.token_program.to_account_info(),
            system_program: self.system_program.to_account_info(),
            rent: self.rent.to_account_info(),
        };


        let cpi_ctx_edition: CpiContext<'_, '_, '_, '_, CreateMasterEditionV3<'_>> =
        CpiContext::new_with_signer(self.token_metadata_program.to_account_info(), accounts, seeds);

        create_master_edition_v3(cpi_ctx_edition, None)?;

        // assign the mint to the paper access pass
        paper_access_pass.mint = Some(self.mint.key());

        Ok(())
    }
}
