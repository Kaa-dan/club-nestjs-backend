import { forwardRef, Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { NodeMembers, NodeMembersSchema } from './entities/node-members.entity';
import { SearchModule } from './search/search.module';
import { Club, ClubSchema } from './entities/club.entity';
import {
  ClubInvitation,
  ClubInvitationSchema,
} from './entities/club-invitation.entity';
import { ClubMembers, ClubMembersSchema } from './entities/clubmembers.entitiy';
import {
  RulesRegulations,
  RulesRegulationsSchema,
} from './entities/rules-requlations.entity';
import { Comment, CommentSchema } from './entities/comment.entity';
import { Reports, ReportsSchema } from './entities/reports.entity';
import {
  ReportOffence,
  ReportOffenceSchema,
} from './entities/report-offense.entity';
import { Node_, NodeSchema } from './entities/node.entity';
import { Issues, IssuesSchema } from './entities/issues.entity';

@Module({
  imports: [
    UploadModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Node_.name, schema: NodeSchema },
      { name: NodeMembers.name, schema: NodeMembersSchema },
      { name: Club.name, schema: ClubSchema },
      { name: ClubInvitation.name, schema: ClubInvitationSchema },
      { name: ClubMembers.name, schema: ClubMembersSchema },
      { name: RulesRegulations.name, schema: RulesRegulationsSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Reports.name, schema: ReportsSchema },
      { name: ReportOffence.name, schema: ReportOffenceSchema },
      { name: Issues.name, schema: IssuesSchema },
    ]),
    forwardRef(() => SearchModule),
  ],
  exports: [MongooseModule, UploadModule, SearchModule],
})
export class SharedModule {}
