use serde::Deserialize;

#[derive(Deserialize)]
#[allow(dead_code)]
pub struct PaginationParams {
    pub page: Option<u32>,
    pub limit: Option<u32>,
    pub sort: Option<String>,
    pub order: Option<String>,
}
