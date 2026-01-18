// Storage helpers - supports Cloudflare R2 (production) and Manus Forge (dev)

import { ENV } from './_core/env';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 Configuration from environment
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'applyfun-storage';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL;

// Check if R2 is configured
function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// Check if Manus Forge is configured
function isManusConfigured(): boolean {
  return !!(ENV.forgeApiUrl && ENV.forgeApiKey);
}

// Create S3 client for R2
function getR2Client(): S3Client {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

// ============ Cloudflare R2 Implementation ============

async function r2Put(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  const client = getR2Client();
  
  // Convert data to buffer
  const body = typeof data === 'string' ? Buffer.from(data) : Buffer.from(data);
  
  const command = new PutObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  
  await client.send(command);
  
  // Return public URL
  const publicUrl = R2_PUBLIC_URL 
    ? `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`
    : `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${R2_BUCKET_NAME}/${key}`;
  
  return { key, url: publicUrl };
}

async function r2Get(relKey: string): Promise<{ key: string; url: string }> {
  const key = relKey.replace(/^\/+/, "");
  
  // If public URL is configured, use it directly
  if (R2_PUBLIC_URL) {
    return {
      key,
      url: `${R2_PUBLIC_URL.replace(/\/+$/, '')}/${key}`,
    };
  }
  
  // Otherwise generate a presigned URL
  const client = getR2Client();
  const command = new GetObjectCommand({
    Bucket: R2_BUCKET_NAME,
    Key: key,
  });
  
  const url = await getSignedUrl(client, command, { expiresIn: 3600 });
  return { key, url };
}

// ============ Manus Forge Implementation ============

function getManusConfig() {
  return { 
    baseUrl: ENV.forgeApiUrl!.replace(/\/+$/, ""), 
    apiKey: ENV.forgeApiKey! 
  };
}

async function manusPut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusConfig();
  const key = relKey.replace(/^\/+/, "");
  
  const uploadUrl = new URL("v1/storage/upload", baseUrl + "/");
  uploadUrl.searchParams.set("path", key);
  
  const blob = typeof data === "string"
    ? new Blob([data], { type: contentType })
    : new Blob([data as any], { type: contentType });
  
  const form = new FormData();
  form.append("file", blob, key.split("/").pop() ?? key);
  
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!response.ok) {
    const message = await response.text().catch(() => response.statusText);
    throw new Error(`Storage upload failed (${response.status}): ${message}`);
  }
  
  const url = (await response.json()).url;
  return { key, url };
}

async function manusGet(relKey: string): Promise<{ key: string; url: string }> {
  const { baseUrl, apiKey } = getManusConfig();
  const key = relKey.replace(/^\/+/, "");
  
  const downloadUrl = new URL("v1/storage/downloadUrl", baseUrl + "/");
  downloadUrl.searchParams.set("path", key);
  
  const response = await fetch(downloadUrl, {
    method: "GET",
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  
  const url = (await response.json()).url;
  return { key, url };
}

// ============ Public API ============

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  // Try R2 first (production), then Manus (dev)
  if (isR2Configured()) {
    return r2Put(relKey, data, contentType);
  }
  
  if (isManusConfigured()) {
    return manusPut(relKey, data, contentType);
  }
  
  throw new Error(
    "No storage configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY for Cloudflare R2."
  );
}

export async function storageGet(relKey: string): Promise<{ key: string; url: string }> {
  if (isR2Configured()) {
    return r2Get(relKey);
  }
  
  if (isManusConfigured()) {
    return manusGet(relKey);
  }
  
  throw new Error("No storage configured.");
}

export async function storageDelete(relKey: string): Promise<void> {
  if (isR2Configured()) {
    const key = relKey.replace(/^\/+/, "");
    const client = getR2Client();
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await client.send(command);
    return;
  }
  
  // Manus doesn't support delete, just log
  console.log('[Storage] Delete not supported for Manus, skipping:', relKey);
}
