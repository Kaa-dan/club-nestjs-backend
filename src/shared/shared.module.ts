import { forwardRef, Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { Node_, NodeSchema } from './entities/node.entity';
import { NodeMembers, NodeMembersSchema } from './entities/node-members.entity';
import { SearchModule } from './search/search.module';
import { Club, ClubSchema } from './entities/club.entity';
import {
  ClubInvitation,
  ClubInvitationSchema,
} from './entities/club-invitation.entity';
import { ClubMembers, ClubMembersSchema } from './entities/clubmembers.entitiy';

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
        schema: NodeMembersSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: Club.name,
        schema: ClubSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: ClubInvitation.name,
        schema: ClubInvitationSchema,
      },
    ]),
    MongooseModule.forFeature([
      {
        name: ClubMembers.name,
        schema: ClubMembersSchema,
      },
    ]),
    forwardRef(() => SearchModule),
  ],
  exports: [MongooseModule, UploadModule, SearchModule], // Export MongooseModule to make User schema accessible
})
export class SharedModule {}
