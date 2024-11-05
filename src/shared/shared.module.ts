import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { Node_, NodeSchema } from './entities/node.entity';
import { NodeMembers, NodeMembersSchema } from './entities/node-members.entity';

@Module({
  imports: [
    UploadModule,
    MongooseModule.forFeature([{ name: 'users', schema: UserSchema }]),
    MongooseModule.forFeature([
      {
        name: 'nodes',
        schema: NodeSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: NodeMembers.name,
        schema: NodeMembersSchema    
      },
    ])
  ],
  exports: [MongooseModule, UploadModule], // Export MongooseModule to make User schema accessible
})
export class SharedModule {}
