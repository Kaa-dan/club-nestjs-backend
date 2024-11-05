import { Module } from '@nestjs/common';
import { NodeService } from './node.service';
import { NodeController } from './node.controller';
import { SharedModule } from 'src/shared/shared.module';
import { MongooseModule } from '@nestjs/mongoose';
import {
  NodeJoinRequest,
  NodeJoinRequestSchema,
} from 'src/shared/entities/node-join-requests.entity';

@Module({
  imports: [
    SharedModule,
    MongooseModule.forFeature([
      { name: 'nodejoinrequests', schema: NodeJoinRequestSchema },
    ]),
  ],
  controllers: [NodeController],
  providers: [NodeService],
})
export class NodeModule {}
