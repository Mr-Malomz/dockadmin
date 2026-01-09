use crate::models::DbType;

/// Validates that an identifier (table, column, or database name) contains only safe characters.
pub fn is_valid_identifier(name: &str) -> bool {
    !name.is_empty()
        && name.len() <= 64
        && name
            .chars()
            .all(|c| c.is_alphanumeric() || c == '_' || c == '-')
        && !name.starts_with(|c: char| c.is_numeric())
}

/// Safely quotes an identifier (table/column name) for use in SQL queries.
pub fn quote_identifier(name: &str, db_type: &DbType) -> String {
    match db_type {
        DbType::Postgres | DbType::Sqlite => {
            // PostgreSQL and SQLite use double quotes
            let escaped = name.replace('"', "\"\"");
            format!("\"{}\"", escaped)
        }
        DbType::Mysql => {
            let escaped = name.replace('`', "``");
            format!("`{}`", escaped)
        }
    }
}

/// Escapes a string value for use in a SQL string literal.
pub fn escape_string_literal(value: &str, db_type: &DbType) -> String {
    match db_type {
        DbType::Postgres => {
            let escaped = value.replace('\'', "''");
            format!("'{}'", escaped)
        }
        DbType::Mysql | DbType::Sqlite => {
            // MySQL and SQLite use doubled single quotes
            let escaped = value.replace('\'', "''");
            format!("'{}'", escaped)
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_identifier() {
        assert!(is_valid_identifier("users"));
        assert!(is_valid_identifier("user_accounts"));
        assert!(is_valid_identifier("table_123"));
        assert!(is_valid_identifier("my-table"));

        // Invalid cases
        assert!(!is_valid_identifier(""));
        assert!(!is_valid_identifier("123table")); // starts with number
        assert!(!is_valid_identifier("table; DROP TABLE users--"));
        assert!(!is_valid_identifier("table' OR '1'='1"));
    }

    #[test]
    fn test_quote_identifier() {
        let name = "my_table";
        assert_eq!(
            quote_identifier(name, &DbType::Postgres),
            "\"my_table\""
        );
        assert_eq!(quote_identifier(name, &DbType::Mysql), "`my_table`");

        // Test escaping
        let evil_name = "table\"name";
        assert_eq!(
            quote_identifier(evil_name, &DbType::Postgres),
            "\"table\"\"name\""
        );
    }

    #[test]
    fn test_escape_string_literal() {
        let value = "O'Reilly";
        assert_eq!(
            escape_string_literal(value, &DbType::Postgres),
            "'O''Reilly'"
        );
        assert_eq!(
            escape_string_literal(value, &DbType::Mysql),
            "'O''Reilly'"
        );
    }
}
