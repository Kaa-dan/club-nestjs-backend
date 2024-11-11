import {
  PipeTransform,
  Injectable,
  BadRequestException,
  ArgumentMetadata,
} from '@nestjs/common';

type AllowedMimeType =
  | 'image/jpeg'
  | 'image/jpg'
  | 'image/png'
  | 'image/gif'
  | 'application/pdf'
  | 'application/msword'
  | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

interface FileValidationConfig {
  maxSizeMB: number;
  allowedMimeTypes: AllowedMimeType[];
  required?: boolean;
}

@Injectable()
export class FileValidationPipe implements PipeTransform {
  constructor(private config: Record<string, FileValidationConfig>) {}
  transform(value: any, metadata: ArgumentMetadata) {
    console.log('Received value:', value);

    // Handle array of files directly
    if (Array.isArray(value)) {
      console.log('Processing array of files');
      const fieldName = Object.keys(this.config)[0];
      return this.validateFiles(value, fieldName);
    }

    // If the value is not an object or null/undefined, return
    if (!value || typeof value !== 'object') {
      console.log('Value is not an object:', value);
      return value;
    }

    console.log('Config:', this.config);
    const fileFields = Object.keys(this.config);

    for (const field of fileFields) {
      console.log(`Validating field: ${field}`);
      const fieldConfig = this.config[field];

      // For single file or array of files
      if (value[field]) {
        const files = Array.isArray(value[field])
          ? value[field]
          : [value[field]];
        this.validateFiles(files, field);
      } else if (fieldConfig.required) {
        throw new BadRequestException(`${field} is required`);
      }
    }

    return value;
  }

  private validateFiles(files: Express.Multer.File[], fieldName: string) {
    console.log(`Validating files for field ${fieldName}:`, files);

    const config = this.config[fieldName];
    if (!config) {
      throw new BadRequestException(
        `No configuration found for field ${fieldName}`,
      );
    }

    const { maxSizeMB, allowedMimeTypes, required = false } = config;
    const maxSizeBytes = maxSizeMB * 1024 * 1024;

    // Check if files are required
    if (required && (!files || files.length === 0)) {
      throw new BadRequestException(`${fieldName} is required`);
    }

    // Validate each file
    files.forEach((file, index) => {
      if (!file) {
        throw new BadRequestException(`Invalid file at index ${index}`);
      }

      if (file.size > maxSizeBytes) {
        throw new BadRequestException(
          `File size for ${fieldName} exceeds ${maxSizeMB} MB`,
        );
      }

      if (!allowedMimeTypes.includes(file.mimetype as AllowedMimeType)) {
        throw new BadRequestException(
          `File type ${file.mimetype} for ${fieldName} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
        );
      }
    });

    return files;
  }
}
