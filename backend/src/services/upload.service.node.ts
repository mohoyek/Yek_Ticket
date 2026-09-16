import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
  constructor(private uploadDir: string) {
    // Ensure upload directory exists
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
  }

  async uploadFile(
    file: Express.Multer.File,
    ticketId: number,
    uploadedBy: number
  ): Promise<{ fileName: string; fileUrl: string }> {
    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      throw new Error('FILE_TOO_LARGE');
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new Error('INVALID_FILE_TYPE');
    }

    // Generate unique file path
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = path.extname(file.originalname);
    const filePath = path.join(this.uploadDir, 'tickets', String(ticketId), `${timestamp}-${random}${ext}`);
    const relativePath = path.join('tickets', String(ticketId), `${timestamp}-${random}${ext}`);

    // Ensure directory exists
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Save file
    fs.writeFileSync(filePath, file.buffer);

    return {
      fileName: file.originalname,
      fileUrl: relativePath,
    };
  }

  async getFileUrl(filePath: string): Promise<string | null> {
    const fullPath = path.join(this.uploadDir, filePath);
    if (!fs.existsSync(fullPath)) return null;
    return filePath;
  }

  async getSignedUrl(filePath: string): Promise<string> {
    return `/api/files/${encodeURIComponent(filePath)}`;
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.join(this.uploadDir, filePath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  }

  async serveFile(filePath: string): Promise<{ buffer: Buffer; contentType: string } | null> {
    const fullPath = path.join(this.uploadDir, filePath);
    if (!fs.existsSync(fullPath)) return null;
    
    const buffer = fs.readFileSync(fullPath);
    const ext = path.extname(filePath).toLowerCase();
    const contentTypes: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.pdf': 'application/pdf',
      '.zip': 'application/zip',
      '.txt': 'text/plain',
      '.doc': 'application/msword',
      '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '.xls': 'application/vnd.ms-excel',
      '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };
    
    return {
      buffer,
      contentType: contentTypes[ext] || 'application/octet-stream',
    };
  }
}
