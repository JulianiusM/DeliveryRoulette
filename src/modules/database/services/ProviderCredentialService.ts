import {IsNull} from 'typeorm';
import {AppDataSource} from '../dataSource';
import {ProviderCredential} from '../entities/provider/ProviderCredential';
import {encrypt, decrypt} from '../../lib/crypto';
import settings from '../../settings';

function getEncryptionKey(): string {
    const key = settings.value.credentialEncryptionKey;
    if (!key) {
        throw new Error('CREDENTIAL_ENCRYPTION_KEY is not configured');
    }
    return key;
}

/**
 * Store a credential (global when userId is null, per-user otherwise).
 * Upserts on the unique (providerKey, credentialKey, userId) combination.
 */
export async function setCredential(
    providerKey: string,
    credentialKey: string,
    plainValue: string,
    userId?: number | null,
): Promise<ProviderCredential> {
    const repo = AppDataSource.getRepository(ProviderCredential);
    const secret = getEncryptionKey();
    const encryptedValue = encrypt(plainValue, secret);

    const where: Record<string, unknown> = {
        providerKey,
        credentialKey,
        userId: userId ?? IsNull(),
    };

    let credential = await repo.findOne({where});

    if (credential) {
        credential.encryptedValue = encryptedValue;
        credential.updatedAt = new Date();
    } else {
        credential = repo.create({
            providerKey,
            credentialKey,
            encryptedValue,
            userId: userId ?? null,
        });
    }

    return await repo.save(credential);
}

/**
 * Retrieve and decrypt a credential.
 * Returns null if not found.
 */
export async function getCredential(
    providerKey: string,
    credentialKey: string,
    userId?: number | null,
): Promise<string | null> {
    const repo = AppDataSource.getRepository(ProviderCredential);
    const secret = getEncryptionKey();

    const where: Record<string, unknown> = {
        providerKey,
        credentialKey,
        userId: userId ?? IsNull(),
    };

    const credential = await repo.findOne({where});
    if (!credential) return null;

    return decrypt(credential.encryptedValue, secret);
}

/**
 * Delete a credential.
 * Returns true if a credential was deleted, false if not found.
 */
export async function deleteCredential(
    providerKey: string,
    credentialKey: string,
    userId?: number | null,
): Promise<boolean> {
    const repo = AppDataSource.getRepository(ProviderCredential);

    const where: Record<string, unknown> = {
        providerKey,
        credentialKey,
        userId: userId ?? IsNull(),
    };

    const credential = await repo.findOne({where});
    if (!credential) return false;

    await repo.remove(credential);
    return true;
}

/**
 * List all credential keys for a provider (without decrypting values).
 * Useful for UI display showing which credentials are configured.
 */
export async function listCredentialKeys(
    providerKey: string,
    userId?: number | null,
): Promise<Array<{credentialKey: string; createdAt: Date; updatedAt: Date}>> {
    const repo = AppDataSource.getRepository(ProviderCredential);

    const where: Record<string, unknown> = {
        providerKey,
        userId: userId ?? IsNull(),
    };

    const credentials = await repo.find({where, order: {credentialKey: 'ASC'}});
    return credentials.map((c) => ({
        credentialKey: c.credentialKey,
        createdAt: c.createdAt,
        updatedAt: c.updatedAt,
    }));
}
