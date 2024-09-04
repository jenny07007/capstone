use anchor_lang::prelude::*;
use anchor_lang::system_program;
use anchor_spl::{
    metadata::{
        create_metadata_accounts_v3,
        mpl_token_metadata::types::{Creator, DataV2},
        CreateMetadataAccountsV3, Metadata,
    },
    token_2022::ID as TOKEN_2022_PROGRAM_ID,
    token_interface::{
        initialize_mint2, non_transferable_mint_initialize, InitializeMint2, Mint,
        NonTransferableMintInitialize, TokenInterface,
    },
};

use crate::{
    error::DeSerHubError,
    states::{Listing, Platform},
};

#[derive(Accounts)]
pub struct CreateMintAndListing<'info> {
    #[account(mut)]
    pub author: Signer<'info>,

    #[account(
        init,
        payer = platform,
        mint::decimals = 0,
        mint::authority = platform,  // Platform is the mint authority
        mint::freeze_authority = platform,  // Platform can freeze accounts
    )]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(
        mut,
        seeds = [b"platform", platform.admin.as_ref()],
        bump = platform.bump,
    )]
    pub platform: Box<Account<'info, Platform>>,

    #[account(
        init,
        seeds = [b"listing", author.key().as_ref(), mint.key().as_ref()],
        bump,
        payer = author,
        space = 8 + Listing::INIT_SPACE,
    )]
    pub listing: Box<Account<'info, Listing>>,

    /// CHECK:` doc comment explaining why no checks through types are necessary.
    #[account(
        seeds = [
            b"metadata",
            metadata_program.key().as_ref(),
            mint.key().as_ref()
        ],
        seeds::program = metadata_program.key(),
        bump,
    )]
    pub metadata_account: UncheckedAccount<'info>,

    #[account(
        seeds = [b"treasury", platform.key().as_ref(), platform.admin.key().as_ref()],
        bump,
    )]
    pub treasury: SystemAccount<'info>,

    pub metadata_program: Program<'info, Metadata>,
    pub token_program: Interface<'info, TokenInterface>,
    pub system_program: Program<'info, System>,

    pub rent: Sysvar<'info, Rent>,
}

impl<'info> CreateMintAndListing<'info> {
    pub fn create_mint_and_listing(
        &mut self,
        uri: String,
        paper_name: String,
        symbol: String,
        mut price: u64,
        is_open_access: bool,
        bumps: &CreateMintAndListingBumps,
    ) -> Result<()> {
        require!(!paper_name.is_empty(), DeSerHubError::EmptyName);
        require!(!symbol.is_empty(), DeSerHubError::EmptySymbol);
        require!(!uri.is_empty(), DeSerHubError::EmptyURI);
        require!(
            (is_open_access && price == 0) || (!is_open_access && price > 0),
            DeSerHubError::InvalidPrice
        );

        require!(
            self.token_program.key() == TOKEN_2022_PROGRAM_ID,
            DeSerHubError::InvalidTokenProgram
        );

        // Initialize the mint
        initialize_mint2(
            CpiContext::new(
                self.token_program.to_account_info(),
                InitializeMint2 {
                    mint: self.mint.to_account_info(),
                },
            ),
            0,
            &self.platform.key(),
            Some(&self.platform.key()),
        )?;

        msg!("Mint initialized successfully.");

        let data = DataV2 {
            name: paper_name.to_string(),
            symbol: symbol.to_string(),
            uri: uri.to_string(),
            creators: Some(vec![Creator {
                share: 100,
                address: self.author.key(),
                verified: true,
            }]),
            seller_fee_basis_points: 0,
            collection: None,
            uses: None,
        };

        let binding = self.metadata_program.key();
        let key = self.mint.key();

        let bump = [bumps.metadata_account];
        let signer_seeds = &[&[
            "metadata".as_bytes().as_ref(),
            binding.as_ref(),
            key.as_ref(),
            &bump,
        ][..]];

        create_metadata_accounts_v3(
            CpiContext::new(
                self.metadata_program.to_account_info(),
                CreateMetadataAccountsV3 {
                    metadata: self.metadata_account.to_account_info(),
                    mint: self.mint.to_account_info(),
                    mint_authority: self.platform.to_account_info(),
                    update_authority: self.platform.to_account_info(),
                    payer: self.author.to_account_info(),
                    system_program: self.system_program.to_account_info(),
                    rent: self.rent.to_account_info(),
                },
            )
            .with_signer(signer_seeds),
            data,
            true,
            false,
            None,
        )?;

        msg!("Metadata account created successfully.");

        // Initialize the mint as non-transferable
        non_transferable_mint_initialize(CpiContext::new(
            self.token_program.to_account_info(),
            NonTransferableMintInitialize {
                token_program_id: self.token_program.to_account_info(),
                mint: self.mint.to_account_info(),
            },
        ))
        .map_err(|_| DeSerHubError::NonTransferableInitializationFailed)?;

        msg!("Mint initialized as non-transferable.");

        // Pay listing fee to platform if not open access
        match is_open_access {
            false => {
                let amount = (price * self.platform.listing_fee_bps as u64) / 10000;
                system_program::transfer(
                    CpiContext::new(
                        self.system_program.to_account_info(),
                        system_program::Transfer {
                            from: self.author.to_account_info(),
                            to: self.treasury.to_account_info(),
                        },
                    ),
                    amount,
                )?;
                msg!("Listing fee paid successfully.");
            }
            true => price = 0,
        }

        self.listing.set_inner(Listing {
            author: self.author.key(),
            mint: self.mint.key(),
            price,
            is_open_access,
            created_at: Clock::get()?.unix_timestamp as i64,
            bump: bumps.listing,
        });

        msg!("Listing created successfully.");

        Ok(())
    }
}
