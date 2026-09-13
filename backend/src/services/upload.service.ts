const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/zip',
  'application/x-zip-compressed',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

export class UploadService {
  constructor(private bucket?: R2Bucket) {}

  async uploadFile(
    file: File,
    ticketId: number,
    uploadedBy: number
  ): Promise<{ fileName: string; fileUrl: string }> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('FILE_TOO_LARGE');
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      throw new Error('INVALID_FILE_TYPE');
    }

    if (!this.bucket) {
      throw new Error('STORAGE_UNAVAILABLE');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = file.name.split('.').pop() || '';
    const filePath = `tickets/${ticketId}/${timestamp}-${random}.${ext}`;

    // Upload to R2
    await this.bucket.put(filePath, file, {
      httpMetadata: {
        contentType: file.type,
      },
    });

    return {
      fileName: file.name,
      fileUrl: filePath,
    };
  }

  async getFileUrl(filePath: string): Promise<string | null> {
    if (!this.bucket) return null;
    const object = await this.bucket.head(filePath);
    if (!object) return null;
    return filePath;
  }

  async getSignedUrl(filePath: string): Promise<string | null> {
    if (!this.bucket) return null;
    const object = await this.bucket.head(filePath);
    if (!object) return null;

    // For R2, we can use presigned URLs or serve through the worker
    // Here we return the path and let the worker serve it
    return `/api/files/${encodeURIComponent(filePath)}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.bucket) return;
    await this.bucket.delete(filePath);
  }

  async serveFile(filePath: string): Promise<R2ObjectBody | null> {
    if (!this.bucket) return null;
    const object = await this.bucket.get(filePath);
    return object;
  }
}
