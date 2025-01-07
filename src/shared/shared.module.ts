import { forwardRef, Module } from '@nestjs/common';
import { UploadModule } from './upload/upload.module';
import { User, UserSchema } from './entities/user.entity';
import { MongooseModule } from '@nestjs/mongoose';
import { NodeMembers, NodeMembersSchema } from './entities/node-members.entity';
import { SearchModule } from './search/search.module';
import { Club, ClubSchema } from './entities/club.entity';
import { Invitation, InvitationSchema } from './entities/invitation.entity';
import { ClubMembers, ClubMembersSchema } from './entities/clubmembers.entitiy';
import {
  RulesRegulations,
  RulesRegulationsSchema,
} from './entities/rules-regulations.entity';
import { Comment, CommentSchema } from './entities/comment.entity';
import { Reports, ReportsSchema } from './entities/reports.entity';
import {
  ReportOffence,
  ReportOffenceSchema,
} from './entities/report-offense.entity';
import { Node_, NodeSchema } from './entities/node.entity';
import { Issues, IssuesSchema } from './entities/issues.entity';
import {
  ProposeRulesAndRegulation,
  ProposeRulesAndRegulationSchema,
} from './entities/propose-rulesAndRegulations';
import { Debate, DebateSchema } from './entities/debate.entity';
import {
  NodeJoinRequest,
  NodeJoinRequestSchema,
} from './entities/node-join-requests.entity';
import {
  ClubJoinRequests,
  ClubJoinRequestsSchema,
} from './entities/club-join-requests.entity';
import {
  DebateArgument,
  DebateArgumentSchema,
} from './entities/debate-argument';
import { Project, ProjectSchema } from './entities/projects/project.entity';
import { ProjectFaq, ProjectFaqSchema } from './entities/projects/faq.enitity';
import {
  ProjectParameter,
  ProjectParameterSchema,
} from './entities/projects/parameter.entity';
import {
  ProjectContribution,
  ProjectContributionSchema,
} from './entities/projects/contribution.entity';
import { ProjectAdoption, ProjectAdoptionSchema } from './entities/projects/project-adoption.entity';
import { ProjectActivities, ProjectActivitiesSchema } from './entities/projects/project-activities.entity';
import { ProjectAnnouncement, ProjectAnnouncementSchema } from './entities/projects/project-announcement.entity';
import { Chapter, ChapterSchema } from './entities/chapters/chapter.entity';
import { ChapterMember, ChapterMemberSchema } from './entities/chapters/chapter-member';
import { Bookmarks, BookmarksSchema } from './entities/bookmarks.entity';
import { DebateAdoption, DebateAdoptionSchema } from './entities/debate/debate-adoption-entity';

@Module({
  imports: [
    UploadModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Node_.name, schema: NodeSchema },
      { name: NodeMembers.name, schema: NodeMembersSchema },
      { name: Club.name, schema: ClubSchema },
      { name: Invitation.name, schema: InvitationSchema },
      { name: ClubMembers.name, schema: ClubMembersSchema },
      { name: RulesRegulations.name, schema: RulesRegulationsSchema },
      { name: Comment.name, schema: CommentSchema },
      { name: Reports.name, schema: ReportsSchema },
      { name: ReportOffence.name, schema: ReportOffenceSchema },
      { name: Issues.name, schema: IssuesSchema },
      {
        name: ProposeRulesAndRegulation.name,
        schema: ProposeRulesAndRegulationSchema,
      },
      { name: Debate.name, schema: DebateSchema },
      { name: DebateAdoption.name, schema: DebateAdoptionSchema },
      { name: NodeJoinRequest.name, schema: NodeJoinRequestSchema },
      { name: ClubJoinRequests.name, schema: ClubJoinRequestsSchema },
      { name: DebateArgument.name, schema: DebateArgumentSchema },
      { name: Project.name, schema: ProjectSchema },
      { name: ProjectFaq.name, schema: ProjectFaqSchema },
      { name: ProjectParameter.name, schema: ProjectParameterSchema },
      { name: ProjectContribution.name, schema: ProjectContributionSchema },
      { name: ProjectAdoption.name, schema: ProjectAdoptionSchema },
      { name: ProjectActivities.name, schema: ProjectActivitiesSchema },
      { name: ProjectAnnouncement.name, schema: ProjectAnnouncementSchema },
      { name: Chapter.name, schema: ChapterSchema },
      { name: ChapterMember.name, schema: ChapterMemberSchema },
      { name: Bookmarks.name, schema: BookmarksSchema },

    ]),
    forwardRef(() => SearchModule),
  ],
  exports: [MongooseModule, UploadModule, SearchModule],
})
export class SharedModule { }
