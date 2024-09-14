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
    #[msg("The provided researcher is not the author of the paper")]
    PayPassInvalidResearcher,
    #[msg("Signer is not the owner of the paper access pass")]
    InvalidOwnerForCreateNft,
    #[msg("Paper access pass already has a minted NFT")]
    NftAlreadyMintedToPaperAccessPass,
    #[msg("The arithmetic operation resulted in an overflow.")]
    ArithmeticOverflow,
}
