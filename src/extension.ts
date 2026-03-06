import * as vscode from 'vscode';
import { findSolutionRoot, getProjectFiles, getDbContexts } from './shared/scanner';
import { ConfigManager } from './shared/config';
import { executeEfCommand } from './shared/terminal';
import { showEfGui } from './ui';

export function activate(context: vscode.ExtensionContext) {
    const register = (id: string, type: 'Add' | 'Update' | 'Remove') => {
        return vscode.commands.registerCommand(id, async (uri: vscode.Uri) => {
            const startPath = uri?.fsPath || vscode.workspace.workspaceFolders?.[0].uri.fsPath;
            if (!startPath) {
				return;
			}

            const slnRoot = findSolutionRoot(startPath);
            if (!slnRoot) {
				return vscode.window.showErrorMessage("No .sln file found.");
			}

            await vscode.window.withProgress({ location: vscode.ProgressLocation.Notification, title: `EFCore: Preparing ${type}...` }, async () => {
                const projects = await getProjectFiles(slnRoot);
                const contexts = await getDbContexts(slnRoot);
                const state = ConfigManager.load(slnRoot, type.toLowerCase());

                showEfGui(type, projects, contexts, state, (res) => {
                    ConfigManager.save(slnRoot, type.toLowerCase(), res);
                    
                    let cmd = `dotnet ef `;
                    if (type === 'Add') {
						cmd += `migrations add ${res.name} --project "${res.targetProj}" --startup-project "${res.startupProj}" --output-dir "${res.outputDir}"`;
                    }
                    if (type === 'Update') {
						cmd += `database update ${res.migrationName || ''} --project "${res.targetProj}" --startup-project "${res.startupProj}"`;
					}
                    if (type === 'Remove') {
						cmd += `migrations remove --project "${res.targetProj}" --startup-project "${res.startupProj}"`;
					}
                    
                    if (res.dbContext) {
						cmd += ` --context ${res.dbContext}`;
					}
                    executeEfCommand(cmd);
                });
            });
        });
    };

    context.subscriptions.push(
        register('efcore.addMigration', 'Add'),
        register('efcore.updateDatabase', 'Update'),
        register('efcore.removeMigration', 'Remove')
    );
}

export function deactivate() {}