import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InterestController } from './interest.controller';
import { InterestService } from './interest.service';
import { Interest, InterestSchema } from '../shared/entities/interest.entity';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'interests', schema: InterestSchema }]),
  ],
  controllers: [InterestController],
  providers: [InterestService],
  exports: [InterestService],
})
export class InterestModule {}
