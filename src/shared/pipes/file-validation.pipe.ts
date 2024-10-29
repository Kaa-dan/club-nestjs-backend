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

  transform(
    files: Express.Multer.File[] | Record<string, Express.Multer.File[]>,
  ) {
    if (!files) {
      throw new BadRequestException('No files uploaded');
    }

    console.log(files, 'dsiadsl');

    const fileFields = Object.keys(this.config);
    fileFields.forEach((field) => {
      const fieldFiles = files[field];
      const {
        maxSizeMB,
        allowedMimeTypes,
        required = false,
      } = this.config[field];
      const maxSizeBytes = maxSizeMB * 1024 * 1024;

      console.log(fieldFiles);
      if (required && (!fieldFiles || fieldFiles.length === 0)) {
        throw new BadRequestException(`${field} is required`);
      }

      if (fieldFiles && fieldFiles.length > 0) {
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
    });

    return files;
  }
}
