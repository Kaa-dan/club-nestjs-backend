import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Invitation } from 'src/shared/entities/invitation.entity';
import { CreateInvitationDto } from './dto/create-invitation.dto';
import { Club } from 'src/shared/entities/club.entity';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { Node_ } from 'src/shared/entities/node.entity';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { ClubJoinRequests } from 'src/shared/entities/club-join-requests.entity';
import { NodeJoinRequest } from 'src/shared/entities/node-join-requests.entity';

@Injectable()
export class InvitationService {
  constructor(
    @InjectModel(Club.name) private clubModel: Model<Club>,
    @InjectModel(Node_.name) private nodeModel: Model<Node_>,
    @InjectModel(Invitation.name)
    private invitationModel: Model<Invitation>,
    @InjectModel(ClubMembers.name)
    private readonly clubMember: Model<ClubMembers>,
    @InjectModel(NodeMembers.name)
    private readonly nodeMember: Model<NodeMembers>,
    @InjectModel(ClubJoinRequests.name)
    private readonly clubJoinRequest: Model<ClubJoinRequests>,
    @InjectModel(NodeJoinRequest.name)
    private readonly nodeJoinRequest: Model<NodeJoinRequest>,
  ) {}

  async getInvitations(userId: Types.ObjectId): Promise<Invitation[]> {
    try {
      const invitations = await this.invitationModel
        .find({
          user: userId,
        })
        .populate('club')
        .populate('node')
        .exec();

      return invitations;
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async createInvitation(
    createInvitationDto: CreateInvitationDto,
    inviteId: Types.ObjectId,
  ) {
    try {
      console.log({ createInvitationDto, inviteId });
      if (createInvitationDto.type === 'node') {
        // checking if the node is valid
        const node = await this.nodeModel.findOne({
          _id: createInvitationDto.entityId,
        });

        if (!node) {
          throw new NotFoundException('Node not found');
        }

        const isMember = await this.nodeMember.findOne({
          node: node._id,
          user: new Types.ObjectId(inviteId),
        });

        if (!isMember) {
          throw new ForbiddenException('You are not a member of this node');
        }

        // checking if already a request is sent
        const isPendingRequest = await this.invitationModel.findOne({
          user: new Types.ObjectId(createInvitationDto.userId),
          node: node._id,
        });

        if (isPendingRequest) {
          throw new BadRequestException('Invitation already sent');
        }

        // creating invitation
        const invitation = new this.invitationModel({
          node: node._id,
          link: node.link,
          user: new Types.ObjectId(createInvitationDto.userId),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          status: 'PENDING',
          createdBy: inviteId,
        });

        // saving invitation
        const savedInvitation = await invitation.save();
        return {
          savedInvitation,
          success: true,
          message: 'invite sent successfully',
        };
      }
      if (createInvitationDto.type === 'club') {
        // checking if the club is valid
        const club = await this.clubModel.findOne({
          _id: createInvitationDto.entityId,
        });

        if (!club) {
          throw new NotFoundException('Club not found');
        }

        //check if the user is a member of the club
        const isMember = await this.clubMember.findOne({
          club: club._id,
          user: new Types.ObjectId(inviteId),
        });

        if (!isMember) {
          throw new ForbiddenException('You are not a member of this club');
        }

        // checking if already a request is sent
        const isPendingRequest = await this.invitationModel.findOne({
          user: new Types.ObjectId(createInvitationDto.userId),
          club: club._id,
        });

        if (isPendingRequest) {
          throw new BadRequestException('Invitation already sent');
        }

        // creating invitation
        const invitation = new this.invitationModel({
          club: club._id,
          link: club.link,
          user: new Types.ObjectId(createInvitationDto.userId),
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
          status: 'PENDING',
          createdBy: inviteId,
        });

        // saving invitation
        const savedInvitation = await invitation.save();
        return {
          savedInvitation,
          success: true,
          message: 'invite sent succesfully',
        };
      }
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async acceptInvitation(
    invitationId: Types.ObjectId,
    userId: Types.ObjectId,
    accept: boolean,
  ): Promise<{ message: string; status: boolean; data: {} | null }> {
    console.log({ invitationId, userId, accept });
    const session = await this.invitationModel.db.startSession();
    session.startTransaction();

    try {
      // Find the invitation first
      const invitation = await this.invitationModel
        .findOne({
          _id: new Types.ObjectId(invitationId),
          user: userId,
        })
        .populate('node')
        .populate('club')
        .session(session);

      if (!invitation) {
        throw new NotFoundException('Invitation not found');
      }

      if (invitation.expiresAt < new Date()) {
        throw new ForbiddenException('Invitation expired');
      }

      // If not accepting, simply delete the invitation and return immediately
      if (!accept) {
        await this.invitationModel.findByIdAndDelete(invitationId, { session });
        await session.commitTransaction();
        return { message: 'Invitation rejected', status: true, data: null };
      }
      let inivtationStatus: 'ACCEPTED' | 'REQUESTED';
      // The code below will only run if accept is true
      if (invitation.node) {
        // Add the user to the node
        if (invitation.node && (invitation.node as any).isPublic) {
          const result = await this.nodeMember.create(
            [
              {
                node: invitation.node._id,
                user: userId,
                role: 'member',
                status: 'MEMBER',
              },
            ],
            { session },
          );
          console.log({ result });
          inivtationStatus = 'ACCEPTED';
        } else {
          const result = await this.nodeJoinRequest.create(
            [
              {
                node: invitation.node._id,
                user: userId,
                role: 'member',
                status: 'REQUESTED',
              },
            ],
            { session },
          );
          console.log({ result });
          inivtationStatus = 'REQUESTED';
        }
      }

      if (invitation.club) {
        // Add the user to the club
        if (invitation.club && (invitation.club as any).isPublic) {
          const response = await this.clubMember.create(
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
          console.log({ response });
          inivtationStatus = 'ACCEPTED';
        } else {
          inivtationStatus = 'REQUESTED';
          const response = await this.clubJoinRequest.create(
            [
              {
                club: invitation.club._id,
                user: userId,
                role: 'member',
                status: 'REQUESTED',
              },
            ],
            { session },
          );
          console.log({ response });
        }
      }

      // Delete the invitation
      await this.invitationModel.findByIdAndDelete(invitationId, { session });

      await session.commitTransaction();
      return {
        message: `Invitation ${inivtationStatus}`,
        status: true,
        data: null,
      };
    } catch (error) {
      await session.abortTransaction();
      throw new BadRequestException(
        error.message || 'Error processing invitation',
      );
    } finally {
      session.endSession();
    }
  }
}
