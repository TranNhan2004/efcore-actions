import * as vscode from 'vscode';

export function executeEfCommand(command: string) {
    const terminalName = "EF Core CLI";
    
    // Find existing terminal or create a new one
    let terminal = vscode.window.terminals.find(t => t.name === terminalName);
    if (!terminal) {
        terminal = vscode.window.createTerminal(terminalName);
    }

    // Show the terminal to the user
    terminal.show();

    // Send the EF Core command
    terminal.sendText(command);
}