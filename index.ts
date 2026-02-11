
#!/usr/bin/env ./node_modules/.bin/ts-node

import { program } from 'commander';
import cp from 'child_process';
import i18n from './packages/i18n/node.index';

// Sanitize input function to prevent command injection
function sanitizeInput(input: string): string {
    return input.replace(/[^a-zA-Z0-9_-]/g, '');  // Allow only alphanumeric characters and _ or -
}

function exec(commandStr: string) {
    const [command, ...args] = commandStr.split(' ');
    cp.execFileSync(command, args, { stdio: 'inherit' });
}

program
    .command('getUserId <username>')
    .description(i18n('getUserIdDescription'))
    .action((username: string) => {
        const sanitizedUsername = sanitizeInput(username);  // Sanitize input
        exec(
            \`npx ts-node --transpile-only packages/bin/index.ts getUserId \${sanitizedUsername}\`,
        );
    });

program
    .command('register <username> <password>')
    .description(i18n('registerDescription'))
    .action((username: string, password: string) => {
        const sanitizedUsername = sanitizeInput(username);  // Sanitize input
        const sanitizedPassword = sanitizeInput(password);  // Sanitize input
        exec(
            \`npx ts-node --transpile-only packages/bin/index.ts register \${sanitizedUsername} \${sanitizedPassword}\`,
        );
    });

program
    .command('deleteUser <userId>')
    .description(i18n('deleteUserDescription'))
    .action((userId: string) => {
        const sanitizedUserId = sanitizeInput(userId);  // Sanitize input
        exec(
            \`npx ts-node --transpile-only packages/bin/index.ts deleteUser \${sanitizedUserId}\`,
        );
    });
