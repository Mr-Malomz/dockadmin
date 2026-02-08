# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned

- Data export (SQL/CSV)
- Data import
- Full-text search
- Connection history

---

## [0.1.0] - 2026-02-05

### Added

- 🐘 **PostgreSQL support** - Full CRUD operations
- 🐬 **MySQL support** - Full CRUD operations
- 📁 **SQLite support** - Full CRUD operations
- 🔐 **Session-based authentication** - Adminer-style DB credential auth
- 📊 **Table browser** - Paginated data viewing with sorting
- ✏️ **Inline editing** - Edit cells directly in the data grid
- ➕ **Row management** - Insert and delete rows
- 📝 **SQL editor** - Execute raw SQL queries with CodeMirror
- 🔍 **Schema viewer** - View table columns, types, and constraints
- 🔗 **Foreign key support** - View and create foreign key relationships
- 🐳 **Docker support** - Optimized multi-stage build (~15MB image)
- 🌙 **Dark mode** - Full dark theme support

### Technical

- Backend: Rust with Axum framework
- Frontend: React 19 with TanStack Router
- Database: SQLx for async database operations
- UI: shadcn/ui components with Tailwind CSS

---

[Unreleased]: https://github.com/Mr-Malomz/dockadmin/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/Mr-Malomz/dockadmin/releases/tag/v0.1.0
