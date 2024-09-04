use anchor_lang::prelude::*;

#[error_code]
pub enum DeSerHubError {
    #[msg("Invalid name length")]
    InvalidNameLength,
    #[msg("Invalid listing fee")]
    InvalidListingFee,
    #[msg("Name cannot be empty")]
    EmptyName,
    #[msg("Symbol cannot be empty")]
    EmptySymbol,
    #[msg("URI cannot be empty")]
    EmptyURI,
    #[msg("Invalid price")]
    InvalidPrice,
    #[msg("Non-transferable mint initialization failed")]
    NonTransferableInitializationFailed,
    #[msg("Invalid token program")]
    InvalidTokenProgram,
}
