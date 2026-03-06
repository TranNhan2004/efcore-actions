import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function findSolutionRoot(startPath: string): string | null {
    let currentDir = startPath;
    while (currentDir !== path.parse(currentDir).root) {
        const files = fs.readdirSync(currentDir);
        if (files.some(f => f.endsWith('.sln'))) {
            return currentDir;
        }
        currentDir = path.dirname(currentDir);
    }
    return null;
}

export async function getProjectFiles(rootPath: string): Promise<string[]> {
    const pattern = new vscode.RelativePattern(rootPath, '**/*.csproj');
    const files = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    return files.map(f => f.fsPath);
}

export async function getDbContexts(rootPath: string): Promise<string[]> {
    const pattern = new vscode.RelativePattern(rootPath, '**/*.cs');
    const csFiles = await vscode.workspace.findFiles(pattern, '**/node_modules/**');
    const contexts = new Set<string>();
    const dbContextRegex = /class\s+([A-Za-z0-9_]+)\s*:\s*(?:[A-Za-z0-9_.\s,<>]*\s*)?(DbContext|IdentityDbContext)/;

    for (const file of csFiles) {
        try {
            const content = fs.readFileSync(file.fsPath, 'utf8');
            const match = content.match(dbContextRegex);
            if (match && match[1]) {
                contexts.add(match[1]);
            }
        } catch (e) { }
    }
    return Array.from(contexts);
}

export async function getMigrations(projectPath: string, migrationsDir: string): Promise<string[]> {
    const projectDir = path.dirname(projectPath);
    const targetPath = path.join(projectDir, migrationsDir);
    
    if (!fs.existsSync(targetPath)) {
        return [];
    }

    try {
        const files = fs.readdirSync(targetPath);
        return files
            .filter(f => f.endsWith('.cs') && !f.endsWith('.Designer.cs') && !f.includes('Snapshot'))
            .map(f => path.basename(f, '.cs'))
            .sort((a, b) => b.localeCompare(a)); // Newest migrations first
    } catch { return []; }
}