import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.service';



@Module({
  imports: [UploadModule], 
  exports: [],
})
export class SharedModule {}
