#[cfg(test)]
mod tests {
    use crate::services::http_service::HttpService;
    use crate::models::http::*;
    use std::collections::HashMap;

    #[tokio::test]
    async fn test_http_service_creation() {
        let service = HttpService::new();
        assert_eq!(service.get_supported_methods().len(), 7);
    }

    #[tokio::test]
    async fn test_default_request_creation() {
        let request = HttpRequest::default();
        assert_eq!(request.method, HttpMethod::Get);
        assert_eq!(request.url, "https://httpbin.org/get");
        assert_eq!(request.name, "New Request");
        assert!(request.follow_redirects);
        assert_eq!(request.timeout_ms, Some(30000));
    }

    #[tokio::test]
    async fn test_get_request() {
        let service = HttpService::new();
        let request = HttpRequest::default();
        
        match service.execute_request(request, None).await {
            Ok(response) => {
                assert_eq!(response.status, 200);
                assert!(response.timing.total_time_ms > 0);
                // httpbin.org/get returns JSON
                assert!(matches!(response.body, ResponseBody::Json { .. }));
            }
            Err(e) => {
                // Skip test if network is unavailable
                println!("Network test skipped: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_post_request_with_json() {
        let service = HttpService::new();
        let mut request = HttpRequest::default();
        request.url = "https://httpbin.org/post".to_string();
        request.method = HttpMethod::Post;
        request.headers.insert("Content-Type".to_string(), "application/json".to_string());
        request.body = Some(RequestBody::Json {
            data: serde_json::json!({"test": "data", "number": 42})
        });
        
        match service.execute_request(request, None).await {
            Ok(response) => {
                assert_eq!(response.status, 200);
                assert!(response.timing.total_time_ms > 0);
                // httpbin.org/post returns JSON with our data
                if let ResponseBody::Json { data } = &response.body {
                    // The response should contain our sent data in the "json" field
                    assert!(data.get("json").is_some());
                }
            }
            Err(e) => {
                // Skip test if network is unavailable
                println!("Network test skipped: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_environment_variable_substitution() {
        let service = HttpService::new();
        let mut request = HttpRequest::default();
        request.url = "https://httpbin.org/get?test={{TEST_VAR}}".to_string();
        
        let mut env_vars = HashMap::new();
        env_vars.insert("TEST_VAR".to_string(), "substituted_value".to_string());
        
        match service.execute_request(request, Some(env_vars)).await {
            Ok(response) => {
                assert_eq!(response.status, 200);
                // The substituted URL should be reflected in the response
                if let ResponseBody::Json { data } = &response.body {
                    // httpbin.org returns the URL in the response
                    if let Some(url) = data.get("url").and_then(|u| u.as_str()) {
                        assert!(url.contains("test=substituted_value"));
                    }
                }
            }
            Err(e) => {
                // Skip test if network is unavailable
                println!("Network test skipped: {}", e);
            }
        }
    }

    #[tokio::test]
    async fn test_connection_test() {
        let service = HttpService::new();
        
        // Test with a known good URL
        match service.test_connection("https://httpbin.org").await {
            Ok(result) => {
                // Should be able to connect to httpbin
                assert!(result);
            }
            Err(_) => {
                // Skip test if network is unavailable
                println!("Network test skipped");
            }
        }
        
        // Test with an invalid URL
        let result = service.test_connection("https://invalid-domain-that-should-not-exist-12345.com").await;
        // This should fail (return false or error)
        assert!(result.is_err() || !result.unwrap());
    }

    #[test]
    fn test_http_method_conversion() {
        assert_eq!(HttpMethod::from("GET"), HttpMethod::Get);
        assert_eq!(HttpMethod::from("get"), HttpMethod::Get);
        assert_eq!(HttpMethod::from("POST"), HttpMethod::Post);
        assert_eq!(HttpMethod::from("PUT"), HttpMethod::Put);
        assert_eq!(HttpMethod::from("DELETE"), HttpMethod::Delete);
        assert_eq!(HttpMethod::from("PATCH"), HttpMethod::Patch);
        assert_eq!(HttpMethod::from("HEAD"), HttpMethod::Head);
        assert_eq!(HttpMethod::from("OPTIONS"), HttpMethod::Options);
        
        // Unknown method defaults to GET
        assert_eq!(HttpMethod::from("UNKNOWN"), HttpMethod::Get);
    }

    #[test]
    fn test_request_body_types() {
        // Test JSON body
        let json_body = RequestBody::Json {
            data: serde_json::json!({"key": "value"})
        };
        assert!(matches!(json_body, RequestBody::Json { .. }));

        // Test raw body
        let raw_body = RequestBody::Raw {
            content: "test content".to_string(),
            content_type: "text/plain".to_string(),
        };
        assert!(matches!(raw_body, RequestBody::Raw { .. }));

        // Test form data
        let mut fields = HashMap::new();
        fields.insert("field1".to_string(), "value1".to_string());
        let form_body = RequestBody::FormData { fields };
        assert!(matches!(form_body, RequestBody::FormData { .. }));
    }
}