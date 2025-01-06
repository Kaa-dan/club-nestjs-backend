import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClubController } from './club.controller';
import { ClubService } from './club.service';
import { Club, ClubSchema } from 'src/shared/entities/club.entity';
import { SharedModule } from 'src/shared/shared.module';
import {
  ClubMembers,
  ClubMembersSchema,
} from 'src/shared/entities/clubmembers.entitiy';
import {
  ClubJoinRequests,
  ClubJoinRequestsSchema,
} from 'src/shared/entities/club-join-requests.entity';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Club.name, schema: ClubSchema },
      { name: ClubMembers.name, schema: ClubMembersSchema },
      { name: ClubJoinRequests.name, schema: ClubJoinRequestsSchema },
    ]),
    SharedModule,
  ],
  controllers: [ClubController],
  providers: [ClubService],
})
export class ClubModule { }
