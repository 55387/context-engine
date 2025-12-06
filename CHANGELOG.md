# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Enhanced CLI with comprehensive context engine management
- NPM package configuration and publishing setup

## [1.0.0] - 2025-12-06

### Added
- Initial release
- Core Context Engine with session and memory management
- Support for multiple storage backends (Memory, FileSystem, SQLite)
- LLM provider integration (Gemini, DeepSeek, Mock)
- CLI tool for interactive chat and memory management
- Comprehensive TypeScript type definitions
- Security features (Authorization, Audit logging)
- Observability (Logging, Metrics)
- Session compaction strategies
- Memory consolidation and deduplication
- Vector similarity search for memory retrieval
- Encryption support for sensitive data

### Features
- **Session Management**: Create, update, delete, and list conversation sessions
- **Memory Management**: Long-term memory with smart consolidation
- **Multi-provider LLM Support**: Gemini, DeepSeek, and mock providers
- **Flexible Storage**: In-memory, filesystem, and SQLite backends
- **Security**: Authorization and audit logging
- **CLI Tool**: Interactive command-line interface
- **Type Safety**: Full TypeScript support with comprehensive type definitions

[unreleased]: https://github.com/your-org/context-engine/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/your-org/context-engine/releases/tag/v1.0.0
