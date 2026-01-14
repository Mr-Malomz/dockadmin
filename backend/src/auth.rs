use axum::{
    Json,
    extract::FromRequestParts,
    http::{StatusCode, request::Parts},
    response::{IntoResponse, Response},
};
use serde_json::json;

use crate::{models::Session, state::SessionStore};

/// Wrapper to hold session in request extensions
#[derive(Clone)]
pub struct SessionExt(pub SessionStore);

pub struct AuthSession(pub Session);

impl<S> FromRequestParts<S> for AuthSession
where
    S: Send + Sync,
{
    type Rejection = Response;

    async fn from_request_parts(parts: &mut Parts, _state: &S) -> Result<Self, Self::Rejection> {
        // Get Authorization header
        let auth_header = parts
            .headers
            .get("authorization")
            .and_then(|v| v.to_str().ok())
            .ok_or_else(|| {
                (
                    StatusCode::UNAUTHORIZED,
                    Json(json!({"success": false, "error": "Missing authorization header"})),
                )
                    .into_response()
            })?;

        // Extract token from "Bearer <token>"
        let token = auth_header.strip_prefix("Bearer ").ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({"success": false, "error": "Invalid authorization format"})),
            )
                .into_response()
        })?;

        // Get session store from extensions
        let session_ext = parts.extensions.get::<SessionExt>().ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                Json(json!({"error": "Session store not configured"})),
            )
                .into_response()
        })?;

        // Look up session
        let store = session_ext.0.read().await;
        let session = store.get(token).cloned().ok_or_else(|| {
            (
                StatusCode::UNAUTHORIZED,
                Json(json!({"success": false, "error": "Invalid or expired session"})),
            )
                .into_response()
        })?;

        Ok(AuthSession(session))
    }
}
