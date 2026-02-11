
#!/usr/bin/env ./node_modules/.bin/ts-node

import { program } from 'commander';
import cp from 'child_process';
import i18n from './packages/i18n/node.index';

function sanitize_input(user_input: string): string {
    if (/^[a-zA-Z0-9_-]+$/.test(user_input)) {
        return user_input;
    } else {
        throw new Error("Invalid input. Only alphanumeric characters, underscores, and hyphens are allowed.");
    }
}

function secure_exec(command_str: string): void {
    try {
        const [command, ...args] = command_str.split(' ');
        const sanitized_args = args.map(sanitize_input);
        cp.execFileSync(command, sanitized_args, { stdio: 'inherit' });
    } catch (e) {
        console.error(`Security Warning: ${e.message}`);
    }
}

program
    .command('getUserId <username>')
    .description(i18n('getUserIdDescription'))
    .action((username: string) => {
        secure_exec(
            `npx ts-node --transpile-only pack`
        );
    });
    