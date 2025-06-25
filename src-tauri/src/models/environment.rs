use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Environment {
    pub id: String,
    pub name: String,
    pub variables: HashMap<String, EnvironmentVariable>,
    pub is_active: bool,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct EnvironmentVariable {
    pub key: String,
    pub value: String,
    pub is_secret: bool,
    pub variable_type: VariableType,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq, Hash)]
#[serde(rename_all = "camelCase")]
pub enum VariableType {
    String,
    Secret,
}




impl Default for Environment {
    fn default() -> Self {
        let now = Utc::now();
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            name: "Development".to_string(),
            variables: HashMap::new(),
            is_active: true,
            created_at: now,
            updated_at: now,
        }
    }
}

impl Default for EnvironmentVariable {
    fn default() -> Self {
        Self {
            key: "".to_string(),
            value: "".to_string(),
            is_secret: false,
            variable_type: VariableType::String,
        }
    }
}

impl VariableType {
    pub fn validate_value(&self, value: &str) -> bool {
        match self {
            VariableType::String => true,
            VariableType::Secret => !value.trim().is_empty(),
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            VariableType::String => "string",
            VariableType::Secret => "secret",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s {
            "secret" => VariableType::Secret,
            _ => VariableType::String,
        }
    }
}

