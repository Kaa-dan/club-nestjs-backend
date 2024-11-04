import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClubController } from './club.controller';
import { ClubService } from './club.service';
import { Club, ClubSchema } from 'src/shared/entities/club.entity';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Club.name, schema: ClubSchema }]),
    SharedModule
  ],
  controllers: [ClubController],
  providers: [ClubService],
})
export class ClubModule {}
