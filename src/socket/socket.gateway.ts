import {
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  // @SubscribeMessage('message')
  // handleMessage(client: any, payload: any): string {
  //   return 'Hello world!';
  // }

  private readonly connectedClients: Map<string, Socket> = new Map();

  handleConnection(client: any, ...args: any[]) {
    this.connectedClients.set(client.id, client);
    ({ connectedClients: this.connectedClients });
  }

  handleDisconnect(client: any) {
    this.connectedClients.delete(client.id);
    ({ connectedClients: this.connectedClients });
  }

  @SubscribeMessage('newComment')
  handleNewComment(client: Socket, @MessageBody() payload: any) {
    // client.broadcast.emit('commentAdded', payload);
    this.server.emit('commentAdded', payload);
  }
}
