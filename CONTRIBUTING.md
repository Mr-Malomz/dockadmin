# Contributing to DockAdmin

First off, thank you for considering contributing to DockAdmin! 🎉

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment](#development-environment)
- [How to Contribute](#how-to-contribute)
- [Pull Request Process](#pull-request-process)
- [Style Guides](#style-guides)

---

## Code of Conduct

This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code.

---

## Getting Started

### Prerequisites

- **Rust** 1.75+ ([rustup.rs](https://rustup.rs/))
- **Node.js** 20+ ([nodejs.org](https://nodejs.org/))
- **Docker** (optional, for testing)

### Setting Up the Development Environment

1. **Fork and clone the repository**

    ```bash
    git clone https://github.com/YOUR_USERNAME/dockadmin.git
    cd dockadmin
    ```

2. **Start the backend**

    ```bash
    cd backend
    cargo run
    ```

3. **Start the frontend (in a new terminal)**

    ```bash
    cd ui
    npm install
    npm run dev
    ```

4. **Start sample databases (optional)**
    ```bash
    docker compose up postgres mysql -d
    ```

---

## How to Contribute

### Reporting Bugs

- Check if the bug has already been reported in [Issues](https://github.com/Mr-Malomz/dockadmin/issues)
- If not, create a new issue using the [Bug Report template](.github/ISSUE_TEMPLATE/bug_report.md)
- Include detailed steps to reproduce the issue

### Suggesting Features

- Check existing [Issues](https://github.com/Mr-Malomz/dockadmin/issues) for similar suggestions
- Create a new issue using the [Feature Request template](.github/ISSUE_TEMPLATE/feature_request.md)
- Explain the use case and proposed solution

### Your First Contribution

Look for issues labeled:

- `good first issue` - Simple issues for newcomers
- `help wanted` - Issues where we need help

---

## Pull Request Process

1. **Create a feature branch**

    ```bash
    git checkout -b feature/your-feature-name
    ```

2. **Make your changes**
    - Write clear, concise commit messages
    - Add tests if applicable
    - Update documentation as needed

3. **Test your changes**

    ```bash
    # Backend
    cd backend && cargo test

    # Frontend
    cd ui && npm run lint
    ```

4. **Push and create a Pull Request**

    ```bash
    git push origin feature/your-feature-name
    ```

5. **Fill out the PR template** with details about your changes

6. **Wait for review** — A maintainer will review your PR and provide feedback

---

## Style Guides

### Rust Code Style

- Follow the official [Rust Style Guide](https://doc.rust-lang.org/nightly/style-guide/)
- Run `cargo fmt` before committing
- Run `cargo clippy` and address any warnings
- Prefer descriptive variable and function names

### TypeScript Code Style

- Use TypeScript strict mode
- Run `npm run lint` before committing
- Use functional components with hooks
- Prefer named exports

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

[optional body]
```

**Types:**

- `feat` — New feature
- `fix` — Bug fix
- `docs` — Documentation changes
- `style` — Code style changes (formatting, etc.)
- `refactor` — Code refactoring
- `test` — Adding or updating tests
- `chore` — Maintenance tasks

**Examples:**

```
feat(api): add table export endpoint
fix(ui): resolve dark mode toggle issue
docs: update README with new features
```

---

## Questions?

Feel free to open an issue or reach out if you have any questions. We're happy to help!

Thank you for contributing! 🚀
