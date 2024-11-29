import { Injectable } from '@nestjs/common';
import { SocketGateway } from './socket.gateway';

@Injectable()
export class SocketService {
  constructor(private socketGateway: SocketGateway) {}

  emitNotification(userId: string, notification: any) {}

  emitNewComment(assetId: string, comment: any) {
    console.log('emmitting ', assetId, comment);
    this.socketGateway.server.emit('newComment', { assetId, comment });
  }
}
