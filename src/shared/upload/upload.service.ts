import { Module } from '@nestjs/common';
import { UploadController } from './upload.controller';

import { ConfigModule } from '@nestjs/config';
import { UploadService } from './upload.module';

@Module({
  imports: [ConfigModule],
  controllers: [UploadController],
  providers: [UploadService],
})
export class UploadModule {}
