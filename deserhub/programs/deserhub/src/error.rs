use anchor_lang::prelude::*;

#[error_code]
pub enum DeSerHubError {
    #[msg("Invalid name length")]
    InvalidNameLength,
    #[msg("Invalid listing fee")]
    InvalidListingFee,
}
