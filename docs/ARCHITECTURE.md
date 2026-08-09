# Architecture

Cracked Console is a local-first Windows desktop application.

## Interface

React and TypeScript render Today, Curriculum, Proof, Projects, Skills, Evidence, Reading, Practice, Guide, Progress, and Settings.

## Domain

Domain modules contain rules for execution, completion, assessments, repair work, evidence, projects, skills, reading, practice, and progress.

Keep domain rules separate from presentation code when practical.

## Plan Configuration

A user-owned JSON file defines the plan.

The configuration can define weeks, days, rest days, work blocks, resources, skills, projects, reading, and practice.

The application validates the configuration before import.

## Data

SQLite stores the imported plan and mutable execution records.

Plan data describes what the user intends to do.

Mutable records describe what the user actually did.

## Native Desktop Boundary

Tauri provides the Windows desktop shell.

Rust provides native functions that need one stable operating-system or database boundary.

Examples include local file reads and writes, transaction-safe configuration import, transaction-safe backup restore, and Windows packaging.

## Local-First Rule

Core use must work without a hosted backend.

An optional integration must not become a requirement for normal execution.

## Transaction Rule

Configuration import and backup restore can change many related rows.

These operations run through one Rust/SQLx transaction on one SQLite connection.

Do not implement a multi-statement transaction by sending separate JavaScript SQL-plugin calls.

## Evidence Rule

Completion and mastery are different concepts.

A completed task can support a skill claim. It does not automatically prove the skill level.

## Backup Rule

Restore validates format version, checksum, and imported plan identity before it changes mutable state.
