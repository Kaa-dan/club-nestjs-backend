import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { SharedModule } from 'src/shared/shared.module';
import { CommentController } from './comment.controller';

@Module({
  imports: [SharedModule],
  providers: [CommentService],
  controllers: [CommentController],
  exports: [CommentService],
})
export class CommentModule { }
