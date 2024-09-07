use anchor_lang::prelude::*;

// like a ticket to a paper
#[account]
#[derive(InitSpace)]
pub struct PaperAccessPass {
    pub mint: Pubkey,
    pub paper_entry: Pubkey,
    pub owner: Pubkey,
    pub price: u64,
    pub is_open_access: bool,
    pub bump: u8,
}
