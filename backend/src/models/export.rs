use serde::Deserialize;

#[derive(Deserialize)]
pub struct ExportParams {
    pub format: Option<String>,
}