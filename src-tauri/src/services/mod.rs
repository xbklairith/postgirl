pub mod collection_service;
pub mod git_service;
pub mod git_branch_service;
pub mod credential_service;
pub mod environment_service;
pub mod http_service;
pub mod database_service {
    pub use super::simple_database_service::*;
}
mod simple_database_service;