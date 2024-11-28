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
    console.log('Client connected:', client.id);
    console.log({ connectedClients: this.connectedClients });
  }

  handleDisconnect(client: any) {
    this.connectedClients.delete(client.id);
    console.log('Client disconnected:', client.id);
    console.log({ connectedClients: this.connectedClients });
  }

  @SubscribeMessage('newComment')
  handleNewComment(client: Socket, @MessageBody() payload: any) {
    console.log('newcomme', payload);
    // client.broadcast.emit('commentAdded', payload);
    this.server.emit('commentAdded', payload);
  }
}
