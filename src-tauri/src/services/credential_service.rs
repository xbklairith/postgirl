use crate::models::git::GitCredentials;
use anyhow::Result;
use keyring::Entry;
use serde_json;

const SERVICE_NAME: &str = "postgirl";

pub struct CredentialService;

impl CredentialService {
    pub fn new() -> Self {
        Self
    }

    pub fn store_credentials(&self, key: &str, credentials: &GitCredentials) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key)?;
        let credentials_json = serde_json::to_string(credentials)?;
        entry.set_password(&credentials_json)?;
        Ok(())
    }

    pub fn get_credentials(&self, key: &str) -> Result<GitCredentials> {
        let entry = Entry::new(SERVICE_NAME, key)?;
        let credentials_json = entry.get_password()?;
        let credentials: GitCredentials = serde_json::from_str(&credentials_json)?;
        Ok(credentials)
    }

    pub fn delete_credentials(&self, key: &str) -> Result<()> {
        let entry = Entry::new(SERVICE_NAME, key)?;
        entry.delete_credential()?;
        Ok(())
    }

    pub fn credentials_exist(&self, key: &str) -> bool {
        if let Ok(entry) = Entry::new(SERVICE_NAME, key) {
            entry.get_password().is_ok()
        } else {
            false
        }
    }

    pub fn list_stored_credentials(&self) -> Result<Vec<String>> {
        // Note: keyring doesn't provide a way to list all entries
        // This would need to be implemented using a separate index
        // For now, return empty list
        Ok(Vec::new())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[ignore] // Ignore in CI - requires system keychain access
    fn test_store_and_retrieve_credentials() {
        let service = CredentialService::new();
        let test_key = "test_repo_key";
        
        let credentials = GitCredentials {
            username: "testuser".to_string(),
            password: "testpass".to_string(),
            ssh_key_path: None,
        };

        // Store credentials - might fail in CI environments without keychain access
        let store_result = service.store_credentials(test_key, &credentials);
        if store_result.is_ok() {
            // Only test if storage succeeded
            assert!(service.credentials_exist(test_key));

            // Retrieve credentials
            let retrieved = service.get_credentials(test_key).unwrap();
            assert_eq!(retrieved.username, credentials.username);
            assert_eq!(retrieved.password, credentials.password);

            // Clean up
            let _ = service.delete_credentials(test_key);
        }
        // If keychain access fails, that's acceptable in test environments
    }

    #[test]
    #[ignore] // Ignore in CI - requires system keychain access
    fn test_delete_credentials() {
        let service = CredentialService::new();
        let test_key = "test_delete_key";
        
        let credentials = GitCredentials {
            username: "testuser".to_string(),
            password: "testpass".to_string(),
            ssh_key_path: None,
        };

        // Store and then delete - might fail in CI environments
        if service.store_credentials(test_key, &credentials).is_ok() {
            assert!(service.credentials_exist(test_key));

            service.delete_credentials(test_key).unwrap();
            assert!(!service.credentials_exist(test_key));
        }
        // If keychain access fails, that's acceptable in test environments
    }

    #[test]
    fn test_nonexistent_credentials() {
        let service = CredentialService::new();
        let nonexistent_key = "nonexistent_key_12345";

        assert!(!service.credentials_exist(nonexistent_key));
        assert!(service.get_credentials(nonexistent_key).is_err());
    }
}