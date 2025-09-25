import { eq, and } from "drizzle-orm";
import { 
  storageConfig, 
  opsDbStaged,
  type StorageConfig,
  type InsertStorageConfig,
  type OpsDbStaged,
  type InsertOpsDbStaged,
} from "@shared/schema";
import { db } from "./db";

// Storage configuration CRUD operations
export class StorageConfigService {
  
  // List all storage configurations or by kind (object/export)
  async list(kind?: string): Promise<StorageConfig[]> {
    if (kind) {
      return await db.select().from(storageConfig).where(eq(storageConfig.kind, kind));
    }
    return await db.select().from(storageConfig);
  }

  // Create or update a storage configuration
  async upsert(config: InsertStorageConfig): Promise<void> {
    // If setting as default, unset other defaults for the same kind
    if (config.isDefault) {
      await db
        .update(storageConfig)
        .set({ isDefault: false })
        .where(eq(storageConfig.kind, config.kind));
    }

    await db
      .insert(storageConfig)
      .values({
        ...config,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: storageConfig.id,
        set: {
          kind: config.kind,
          provider: config.provider,
          isDefault: config.isDefault || false,
          mirror: config.mirror || false,
          cfg: config.cfg,
          updatedAt: new Date(),
        },
      });
  }

  // Delete a storage configuration
  async delete(id: string): Promise<void> {
    await db.delete(storageConfig).where(eq(storageConfig.id, id));
  }

  // Test a storage provider configuration
  async test(config: InsertStorageConfig): Promise<{ ok: boolean; detail?: string }> {
    try {
      switch (config.provider) {
        case 's3': {
          const { S3Client, ListBucketsCommand } = await import('@aws-sdk/client-s3');
          const client = new S3Client({
            endpoint: config.cfg.endpoint,
            region: config.cfg.region || 'auto',
            credentials: config.cfg.accessKeyId ? {
              accessKeyId: config.cfg.accessKeyId,
              secretAccessKey: config.cfg.secretAccessKey
            } : undefined,
            forcePathStyle: config.cfg.forcePathStyle ?? false
          });
          await client.send(new ListBucketsCommand({}));
          return { ok: true };
        }
        
        case 'gdrive': {
          const { google } = await import('googleapis');
          const auth = new google.auth.GoogleAuth({
            scopes: ['https://www.googleapis.com/auth/drive.file'],
            credentials: config.cfg.serviceAccountJson
          });
          const drive = google.drive({ version: 'v3', auth });
          await drive.files.list({ pageSize: 1 });
          return { ok: true };
        }
        
        case 'gcs': {
          const { Storage } = await import('@google-cloud/storage');
          const storage = new Storage({
            projectId: config.cfg.projectId,
            keyFilename: config.cfg.keyFilename || undefined,
            credentials: config.cfg.credentials || undefined
          });
          await storage.getBuckets({ maxResults: 1 });
          return { ok: true };
        }

        case 'azure_blob': {
          const { BlobServiceClient, StorageSharedKeyCredential } = await import('@azure/storage-blob');
          const credential = new StorageSharedKeyCredential(config.cfg.accountName, config.cfg.accountKey);
          const blobServiceClient = new BlobServiceClient(
            `https://${config.cfg.accountName}.blob.core.windows.net`,
            credential
          );
          const containerClient = blobServiceClient.getContainerClient(config.cfg.containerName);
          await containerClient.listBlobsFlat({ maxPageSize: 1 }).byPage().next();
          return { ok: true };
        }

        case 'sftp': {
          const SftpClient = (await import('ssh2-sftp-client')).default;
          const sftp = new SftpClient();
          await sftp.connect({
            host: config.cfg.host,
            port: config.cfg.port || 22,
            username: config.cfg.username,
            password: config.cfg.password,
          });
          await sftp.list('/');
          await sftp.end();
          return { ok: true };
        }

        default:
          // For providers without SDK implementation, accept configuration presence as "ping"
          return { ok: !!config.cfg && Object.keys(config.cfg).length > 0 };
      }
    } catch (e: any) {
      return { ok: false, detail: e?.message || String(e) };
    }
  }
}

// Operational database staging operations
export class OpsDbService {
  
  // Get current operational database info
  async getCurrent(): Promise<{ driver: string; database_url: string }> {
    const databaseUrl = process.env.DATABASE_URL;
    return {
      driver: databaseUrl ? 'postgres' : 'sqlite',
      database_url: databaseUrl || 'sqlite://data/arus.sqlite'
    };
  }

  // Stage a new operational database URL
  async stage(url: string): Promise<void> {
    await db
      .insert(opsDbStaged)
      .values({ id: 1, url, createdAt: new Date() })
      .onConflictDoUpdate({
        target: opsDbStaged.id,
        set: { url, createdAt: new Date() }
      });
  }

  // Get currently staged database URL
  async getStaged(): Promise<OpsDbStaged | null> {
    const result = await db.select().from(opsDbStaged).where(eq(opsDbStaged.id, 1));
    return result[0] || null;
  }

  // Test a database connection
  async test(url: string): Promise<{ ok: boolean; detail?: string }> {
    if (!url) return { ok: false, detail: 'empty url' };
    if (!/^postgres:/i.test(url)) return { ok: false, detail: 'only Postgres URLs supported' };
    
    try {
      const { Client } = await import('pg');
      const client = new Client({ connectionString: url });
      await client.connect();
      await client.query('SELECT 1');
      await client.end();
      return { ok: true };
    } catch (e: any) {
      return { ok: false, detail: e?.message || String(e) };
    }
  }
}

// Singleton instances
export const storageConfigService = new StorageConfigService();
export const opsDbService = new OpsDbService();