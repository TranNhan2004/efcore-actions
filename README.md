# EFCore Actions

Stop typing long `dotnet ef` commands. This extension provides a visual interface for Entity Framework Core migrations with automatic project discovery and shared configuration.

Current version: `1.0.1`

## Key Features

- **Solution-Wide Scanning**: Automatically finds all `.csproj` files and `DbContext` classes within your `.sln` or `.slnx` boundary.
- **System Folder Browser**: Browse and select output folders for migrations directly through the OS dialog—no manual path typing required.
- **Persistent Config**: Saves your selections to `.vscode/efcore-actions.json`. Share this file with your team so everyone uses the same Startup and Target projects.
- **Dynamic Migration List**: The "Update Database" tool scans your migration folder and provides a dropdown of existing migrations.

## Commands

1.  **Add Migration**: Set migration name and custom output directory.
2.  **Update Database**: Apply all pending migrations or revert to a specific one.
3.  **Remove Migration**: Safely remove the last unapplied migration with built-in warnings.

## Requirements

- `dotnet-ef` global tool installed.
- A `.sln` or `.slnx` file in your workspace to define the project scope.
