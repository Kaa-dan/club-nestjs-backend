import {
  Controller,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  ParseFilePipe,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { UploadService } from './upload.module';

@Controller('upload')
export class UploadController {
  constructor(private readonly uploadService: UploadService) {}
  /**
   * Upload files in cloudinary or s3 bucket
   * @Body file - image
   * @returns Promise<>
   */
  @Post()
  //using file interceptor to get buffer
  @UseInterceptors(FileInterceptor('file'))

  //controller to upload file
  async uploadedFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          //   new MaxFileSizeValidator({ maxSize: 1000 }),
        //   new FileTypeValidator({ fileType: 'image/jpeg' }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return await this.uploadService.uploadFile(file);
  }
}
