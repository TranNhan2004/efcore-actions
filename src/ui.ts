import * as vscode from 'vscode';
import * as path from 'path';
import { EfState } from './shared/config';
import { getMigrations } from './shared/scanner';

const titleMap = {
    'Add': 'Add Migration',
    'Update': 'Update Database',
    'Remove': 'Remove Last Migration'
};

function getBaseStyles() {
    return `
        <style>
            body { padding: 20px; font-family: var(--vscode-font-family); color: var(--vscode-foreground); background-color: var(--vscode-editor-background); }
            .field { margin-bottom: 15px; }
            .input-group { display: flex; gap: 5px; }
            label { display: block; margin-bottom: 5px; font-weight: bold; font-size: 12px; }
            input, select { width: 100%; padding: 8px; box-sizing: border-box; background: var(--vscode-input-background); color: var(--vscode-input-foreground); border: 1px solid var(--vscode-input-border); outline: none; }
            input:focus, select:focus { border: 1px solid var(--vscode-focusBorder); }
            .btn-browse { width: 80px; flex-shrink: 0; background: var(--vscode-button-secondaryBackground); color: var(--vscode-button-secondaryForeground); cursor: pointer; border: none; }
            .btn-browse:hover { background: var(--vscode-button-secondaryHoverBackground); }
            button#exec-btn { background: var(--vscode-button-background); color: var(--vscode-button-foreground); border: none; padding: 10px; cursor: pointer; font-weight: bold; width: 100%; margin-top: 10px; }
            button#exec-btn:hover { background: var(--vscode-button-hoverBackground); }
            .hint { font-size: 11px; color: var(--vscode-descriptionForeground); margin-top: 4px; }
        </style>`;
}

export function showEfGui(type: 'Add' | 'Update' | 'Remove', projects: string[], contexts: string[], state: EfState, onConfirm: (data: any) => void) {
    const panel = vscode.window.createWebviewPanel('efCoreGui', `EF Core: ${type}`, vscode.ViewColumn.Active, { enableScripts: true });

    const projOpts = (selected?: string) => projects.map(p => `<option value="${p}" ${p === selected ? 'selected' : ''}>${path.basename(p)}</option>`).join('');
    const ctxOpts = (selected?: string) => contexts.map(c => `<option value="${c}" ${c === selected ? 'selected' : ''}>${c}</option>`).join('');

    let specificFields = '';
    if (type === 'Add') {
        specificFields = `
            <div class="field"><label>Migration Name</label><input type="text" id="name" placeholder="e.g. InitialCreate" autofocus></div>
            <div class="field"><label>Output Folder</label>
                <div class="input-group">
                    <input type="text" id="outputDir" value="${state.outputDir || 'Migrations'}" readonly>
                    <button class="btn-browse" onclick="browseFolder()">Browse</button>
                </div>
            </div>`;
    } else if (type === 'Update') {
        specificFields = `
            <div class="field"><label>Migrations Folder (Scan Source)</label>
                <div class="input-group">
                    <input type="text" id="outputDir" value="${state.outputDir || 'Migrations'}" readonly>
                    <button class="btn-browse" onclick="browseFolder()">Browse</button>
                </div>
            </div>
            <div class="field"><label>Target Migration</label>
                <select id="migrationName">
                    <option value="">[Latest / Update All]</option>
                    <option value="0">0 (Revert All)</option>
                </select>
            </div>`;
    }

    panel.webview.html = `
        <html><head>${getBaseStyles()}</head><body>
            <h2>${titleMap[type]}</h2>
            ${specificFields}
            <div class="field"><label>Target Project</label><select id="targetProj" onchange="refreshMigrations()">${projOpts(state.targetProj)}</select></div>
            <div class="field"><label>Startup Project</label><select id="startupProj">${projOpts(state.startupProj)}</select></div>
            <div class="field"><label>DbContext</label><select id="dbContext">${ctxOpts(state.dbContext)}</select></div>
            <button id="exec-btn" onclick="submit()">${type === 'Remove' ? 'Remove Now' : 'Execute'}</button>

            <script>
                const vscode = acquireVsCodeApi();

                // Initial load
                if ("${type}" === "Update") setTimeout(refreshMigrations, 100);

                function browseFolder() {
                    vscode.postMessage({ command: 'browse', targetProjPath: document.getElementById('targetProj').value });
                }

                function refreshMigrations() {
                    if ("${type}" !== "Update") return;
                    vscode.postMessage({ 
                        command: 'getMigrations', 
                        projectPath: document.getElementById('targetProj').value,
                        migrationsDir: document.getElementById('outputDir').value
                    });
                }

                function submit() {
                    vscode.postMessage({
                        command: 'submit',
                        name: document.getElementById('name')?.value || '',
                        outputDir: document.getElementById('outputDir')?.value || '',
                        migrationName: document.getElementById('migrationName')?.value || '',
                        targetProj: document.getElementById('targetProj').value,
                        startupProj: document.getElementById('startupProj').value,
                        dbContext: document.getElementById('dbContext').value
                    });
                }

                window.addEventListener('message', event => {
                    const msg = event.data;
                    if (msg.command === 'setFolder') {
                        document.getElementById('outputDir').value = msg.path;
                        refreshMigrations();
                    }
                    if (msg.command === 'setMigrations') {
                        const select = document.getElementById('migrationName');
                        while (select.options.length > 2) select.remove(2);
                        msg.migrations.forEach(m => {
                            const opt = document.createElement('option');
                            opt.value = m; opt.text = m; select.add(opt);
                        });
                    }
                });
            </script>
        </body></html>`;

    panel.webview.onDidReceiveMessage(async (data) => {
        if (data.command === 'browse') {
            const projectDir = path.dirname(data.targetProjPath);
            const folderUri = await vscode.window.showOpenDialog({ canSelectFiles: false, canSelectFolders: true, defaultUri: vscode.Uri.file(projectDir) });
            if (folderUri && folderUri[0]) {
                const relPath = path.relative(projectDir, folderUri[0].fsPath).split(path.sep).join('/') || '.';
                panel.webview.postMessage({ command: 'setFolder', path: relPath });
            }
        } else if (data.command === 'getMigrations') {
            const list = await getMigrations(data.projectPath, data.migrationsDir);
            panel.webview.postMessage({ command: 'setMigrations', migrations: list });
        } else if (data.command === 'submit') {
            onConfirm(data);
            panel.dispose();
        }
    });
}