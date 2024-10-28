import { Module } from '@nestjs/common';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    
  ],
  exports: [MongooseModule], // Export MongooseModule to make User schema accessible
})
export class SharedModule {}
