import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';

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

  transform(value: any) {
    // If the value is not an object or null/undefined, return it as is
    if (!value || typeof value !== 'object') {
      return value;
    }

    // Check if we're dealing with files (they should have buffer property)
    const hasFiles =
      value.buffer ||
      (Array.isArray(value) && value[0]?.buffer) ||
      Object.values(value).some((v) => Array.isArray(v) && v[0]?.buffer);

    if (!hasFiles) {
      return value;
    }

    const files = value;
    const fileFields = Object.keys(this.config);

    for (const field of fileFields) {
      const fieldFiles = files[field];
      const {
        maxSizeMB,
        allowedMimeTypes,
        required = false,
      } = this.config[field];
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      if (
        required &&
        (!fieldFiles || !Array.isArray(fieldFiles) || fieldFiles.length === 0)
      ) {
        throw new BadRequestException(`${field} is required`);
      }

      if (fieldFiles && Array.isArray(fieldFiles) && fieldFiles.length > 0) {
        fieldFiles.forEach((file) => {
          if (!file) return;

          if (file.size > maxSizeBytes) {
            throw new BadRequestException(
              `File size for ${field} exceeds ${maxSizeMB} MB`,
            );
          }
          if (!allowedMimeTypes.includes(file.mimetype as AllowedMimeType)) {
            throw new BadRequestException(
              `File type ${file.mimetype} for ${field} is not allowed. Allowed types: ${allowedMimeTypes.join(', ')}`,
            );
          }
        });
      }
    }

    return files;
  }
}
