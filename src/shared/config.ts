import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export interface EfState {
    targetProj?: string;
    startupProj?: string;
    dbContext?: string;
    outputDir?: string;
    migrationName?: string;
}

export class ConfigManager {
    private static getPath(slnRoot: string): string {
        const vscodeFolder = path.join(slnRoot, '.vscode');
        if (!fs.existsSync(vscodeFolder)) {
            fs.mkdirSync(vscodeFolder, { recursive: true });
        }
        return path.join(vscodeFolder, 'efcore-actions.json');
    }

    static load(slnRoot: string, key: string): EfState {
        const filePath = this.getPath(slnRoot);
        if (!fs.existsSync(filePath)) {
            return {};
        }
        try {
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            return data[key] || {};
        } catch { return {}; }
    }

    static save(slnRoot: string, key: string, state: EfState) {
        const filePath = this.getPath(slnRoot);
        let data: any = {};
        if (fs.existsSync(filePath)) {
            try { data = JSON.parse(fs.readFileSync(filePath, 'utf8')); } catch { }
        }
        data[key] = state;
        fs.writeFileSync(filePath, JSON.stringify(data, null, 4), 'utf8');
    }
}