use std::{collections::HashMap, sync::Arc};

use crate::models::Session;

use tokio::sync::RwLock;

// map session token to session objects
pub type SessionStore = Arc<RwLock<HashMap<String, Session>>>;

// create an empty session store
pub fn create_session_store() -> SessionStore {
    Arc::new(RwLock::new(HashMap::new()))
}
