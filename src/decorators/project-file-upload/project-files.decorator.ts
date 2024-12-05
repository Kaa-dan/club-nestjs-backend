import { UseInterceptors } from '@nestjs/common';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { FILE_UPLOAD_CONFIG } from './file-upload.constants';

export function ProjectFiles() {
  return UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'file', maxCount: 5 },
        { name: 'bannerImage', maxCount: 1 },
      ],
      FILE_UPLOAD_CONFIG,
    ),
  );
}
