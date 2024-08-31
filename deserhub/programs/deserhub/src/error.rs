use anchor_lang::prelude::*;

#[error_code]
pub enum DeSerHubError {
    #[msg("Name is too long")]
    NameTooLong,
}
