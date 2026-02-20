import { Client, SearchOptions } from 'ldapts';

export type LdapConfig = {
    enable: boolean;
    url: string;
    bindDN: string;
    bindCredentials: string;
    searchBase: string;
    searchFilter: string;
    tlsOptions?: Record<string, unknown>;
};

export type LdapUser = {
    dn: string;
    attributes: Record<string, unknown>;
};

function formatSearchFilter(template: string, username: string) {
    return template.replace(/\{\{username\}\}/g, username);
}

export async function authenticateWithLdap(
    config: LdapConfig,
    username: string,
    password: string,
): Promise<LdapUser | null> {
    if (!config.enable) {
        return null;
    }

    const client = new Client({
        url: config.url,
        tlsOptions: config.tlsOptions,
    });

    try {
        await client.bind(config.bindDN, config.bindCredentials);

        const filter = formatSearchFilter(config.searchFilter, username);
        const { searchEntries } = await client.search(config.searchBase, {
            scope: 'sub',
            filter,
            sizeLimit: 1,
        });

        if (!searchEntries || searchEntries.length === 0) {
            return null;
        }

        const entry = searchEntries[0];
        const userDn = entry.dn;

        await client.bind(userDn, password);

        return {
            dn: userDn,
            attributes: entry as unknown as Record<string, unknown>,
        };
    } finally {
        await client.unbind();
    }
}
