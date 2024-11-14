import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ClubInvitation,
  ClubInvitationDocument,
} from 'src/shared/entities/club-invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { Club } from 'src/shared/entities/club.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(Club.name) private clubModel: Model<Club>,
    @InjectModel(ClubInvitation.name)
    private invitationModel: Model<ClubInvitationDocument>,
    @InjectModel(ClubMembers.name)
    private readonly clubMember: Model<ClubMembers>,
  ) {}

  async getInvitations(userId: Types.ObjectId): Promise<ClubInvitation[]> {
    try {
      const invitations = await this.invitationModel.find({
        user: userId,
      });
      return invitations;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async createInvitation(
    createInvitationDto: CreateInvitationDto,
    adminId: Types.ObjectId,
  ): Promise<ClubInvitation> {
    try {
      // checking if the club is valid
      const club = await this.clubModel.findOne({
        _id: createInvitationDto.clubId,
      });

      if (!club) {
        throw new NotFoundException('Club not found');
      }
      //checking if the user can sent the request
      const isAdminOrModerator = await this.clubMember.findOne({
        club: new Types.ObjectId(createInvitationDto.clubId),
        user: new Types.ObjectId(adminId),
        $or: [{ role: 'admin' }, { role: 'moderator' }],
      });
      if (!isAdminOrModerator) {
        throw new BadRequestException(
          'You are not authorized to send invitation',
        );
      }
      // checking if already a request is sent
      const isPendingRequest = await this.invitationModel.findOne({
        user: createInvitationDto.userId,
        club: club._id,
      });

      if (isPendingRequest) {
        throw new BadRequestException('Invitation already sent');
      }

      // creating invitation
      const invitation = new this.invitationModel({
        club: club._id,
        link: club.link,
        user: createInvitationDto.userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        status: 'PENDING',
        createdBy: adminId,
      });
      // saving invitation
      const savedInvitation = await invitation.save();
      return savedInvitation;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  async acceptInvitation(
    invitationId: Types.ObjectId,
    userId: Types.ObjectId,
  ): Promise<void> {
    const session = await this.invitationModel.db.startSession();
    session.startTransaction();

    try {
      const invitation = await this.invitationModel
        .findOne({
          _id: invitationId,
          user: userId,
        })
        .session(session);

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.expiresAt < new Date()) {
        throw new ForbiddenException('Invitation expired');
      }

      // Add the user to the club
      await this.clubMember.create(
        [
          {
            club: invitation.club._id,
            user: userId,
            role: 'member',
            status: 'MEMBER',
          },
        ],
        { session },
      );

      // Delete the invitation
      await this.invitationModel.findByIdAndDelete(invitationId, { session });

      await session.commitTransaction();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  }
}
