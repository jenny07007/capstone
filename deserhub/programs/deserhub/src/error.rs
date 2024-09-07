use anchor_lang::prelude::*;

#[error_code]
pub enum DeSerHubError {
    #[msg("Invalid name length")]
    InvalidNameLength,
    #[msg("Invalid listing fee")]
    InvalidListingFee,
    #[msg("Title is empty")]
    EmptyTitle,
    #[msg("Description is empty")]
    EmptyDescription,
    #[msg("Uri is empty")]
    EmptyUri,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Title is too long")]
    TitleTooLong,
    #[msg("Description is too long")]
    DescriptionTooLong,
    #[msg("Uri is too long or null")]
    UriTooLongOrNull,
    #[msg("Insufficient balance for listing")]
    InsufficientBalanceForListing,
}
