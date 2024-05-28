import fs from 'fs';
import path from 'path';
import finiteStateSdk from 'finite_state_sdk';
import { promisify } from 'util';

const TOKEN_EXPIRATION_TIME = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
const TOKEN_DIRECTORY = '.tokencache';

const mkdir = promisify(fs.mkdir);
const exists = promisify(fs.exists);
const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);
const stat = promisify(fs.stat);

class TokenCache {
    private token: string | null = null;
    private tokenFile: string;

    constructor(private organizationContext: string, private clientId?: string) {
        const tokenPath = this.clientId
            ? path.join(TOKEN_DIRECTORY, `${this.organizationContext}-${this.clientId}`)
            : path.join(TOKEN_DIRECTORY, this.organizationContext);

        this.tokenFile = path.join(tokenPath, 'token.txt');

        this.initializeTokenCache(tokenPath);
    }

    private async initializeTokenCache(tokenPath: string): Promise<void> {
        if (!(await exists(TOKEN_DIRECTORY))) {
            await mkdir(TOKEN_DIRECTORY);
        }

        if (!(await exists(tokenPath))) {
            await mkdir(tokenPath);
        }
    }

    private async getTokenFromApi(clientId: string, clientSecret: string): Promise<void> {
        this.token = await finiteStateSdk.getAuthToken(clientId, clientSecret);
        await writeFile(this.tokenFile, this.token, 'utf8');
    }

    public async getToken(clientId: string, clientSecret: string): Promise<string> {
        if (this.token === null) {
            if (await exists(this.tokenFile)) {
                const stats = await stat(this.tokenFile);
                if (stats.mtime.getTime() < Date.now() - TOKEN_EXPIRATION_TIME) {
                    console.log('Token is more than 24 hours old, deleting it...');
                    await this.invalidateToken();
                    await this.getTokenFromApi(clientId, clientSecret);
                } else {
                    console.log('Getting saved token from disk...');
                    this.token = await readFile(this.tokenFile, 'utf8');
                }
            } else {
                console.log('Querying the API for a new token...');
                await this.getTokenFromApi(clientId, clientSecret);
            }
        }

        return this.token!;
    }

    public async invalidateToken(): Promise<void> {
        this.token = null;
        if (await exists(this.tokenFile)) {
            await unlink(this.tokenFile);
        }
    }
}

export default TokenCache;
