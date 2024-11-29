import { Module } from '@nestjs/common';
import { CommentService } from './comment.service';
import { SharedModule } from 'src/shared/shared.module';
import { CommentController } from './comment.controller';
import { SocketModule } from 'src/socket/socket.module';
import { SocketService } from 'src/socket/socket.service';

@Module({
  imports: [SharedModule, SocketModule],
  providers: [CommentService, SocketService],
  controllers: [CommentController],
  exports: [CommentService],
})
export class CommentModule {}
