use anchor_lang::prelude::*;

// Listed paper
#[account]
#[derive(InitSpace)]
pub struct PaperEntry {
    pub researcher: Pubkey,
    #[max_len(300)]
    pub title: String,
    #[max_len(500)]
    pub description: String,
    #[max_len(66)]
    pub uri: String,
    pub price: u64,
    pub is_open_access: bool,
    pub created_at: i64,
}
