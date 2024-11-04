import { Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { Node_, NodeSchema } from './entities/node.entity';

@Module({
  imports: [
    UploadModule,
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    MongooseModule.forFeature([
      {
        name: Node_.name,
        schema: NodeSchema,
      },
    ]),
  ],
  exports: [MongooseModule, UploadModule], // Export MongooseModule to make User schema accessible
})
export class SharedModule {}
