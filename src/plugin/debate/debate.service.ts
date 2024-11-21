import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { Debate } from 'src/shared/entities/debate.entity';
import { NodeMembers } from 'src/shared/entities/node-members.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { CreateDebateDto } from './dto/create.dto';
@Injectable()
export class DebateService {
  constructor(
    @InjectModel(Debate.name) private debateModel: Model<Debate>,
    @InjectModel(ClubMembers.name) private clubMembersModel: Model<ClubMembers>,
    @InjectModel(NodeMembers.name) private nodeMembersModel: Model<NodeMembers>,
    private readonly s3FileUpload: UploadService,
  ) {}

  async createDebate(createDebateDto, userId: string) {
    try {
      const {
        publishedStatus: requestedStatus,
        files,
        club,
        node,
        closingDate,
        openingDate,
        ...rest
      } = createDebateDto;
      console.log({ createDebateDto });

      // Ensure either club or node is provided, not both
      if (!club && !node) {
        throw new BadRequestException('Either club or node must be provided.');
      }
      if (club && node) {
        throw new BadRequestException(
          'Provide only one of club or node, not both.',
        );
      }

      // Determine section based on which id is provided
      const section = club ? 'club' : 'node';
      const sectionId = club || node;

      // Handle file upload
      const uploadPromises = files?.map((file: any) =>
        this.uploadFile(
          {
            buffer: file.buffer,
            originalname: file.originalname,
            mimetype: file.mimetype,
          } as Express.Multer.File,
          section,
        ),
      );

      const uploadedFiles = await Promise.all(uploadPromises);

      // Map the uploaded files to the appropriate file structure
      const fileObjects = uploadedFiles.map((uploadedFile, index) => ({
        url: uploadedFile.url,
        originalname: files[index].originalName,
        mimetype: files[index].mimetype,
        size: files[index].size,
      }));

      // Define the member check function based on the section type
      const getMember = async () => {
        if (section === 'club') {
          return this.clubMembersModel.findOne({
            club: new Types.ObjectId(sectionId), // Search for membership in the specified club
            user: userId,
          });
        }
        return this.nodeMembersModel.findOne({
          node: new Types.ObjectId(sectionId), // Search for membership in the specified node
          user: userId,
        });
      };

      // Check if the user is a member of the specified club or node
      const member = await getMember();
      console.log({ member });

      if (!member) {
        throw new NotFoundException(`User is not a member of the ${section}`);
      }

      // Handle publication status
      let publishedStatus: 'draft' | 'published' | 'proposed' = 'proposed';
      let publishedBy: string | null = null;

      // Only admins or moderators can publish the debate
      if (['admin', 'moderator'].includes(member.role)) {
        publishedStatus = requestedStatus === 'draft' ? 'draft' : 'published';
        if (publishedStatus === 'published') {
          publishedBy = userId;
        }
      }

      if (!['draft', 'published', 'proposed'].includes(publishedStatus)) {
        throw new BadRequestException('Invalid published status');
      }

      // Create the debate document, ensuring proper assignment of sectionId (club or node)
      const debate = new this.debateModel({
        ...rest,

        node: section === 'node' ? new Types.ObjectId(sectionId) : null, // Assign node if section is node
        club: section === 'club' ? new Types.ObjectId(sectionId) : null, // Assign club if section is club
        openingDate,
        closingDate,
        createdBy: userId,
        publishedStatus,
        publishedBy,
        files: fileObjects, // Store the file URLs from S3
      });

      const savedDebate = await debate.save();

      const statusMessages = {
        draft: 'Debate saved as draft successfully.',
        proposed: 'Debate proposed successfully.',
        published: 'Debate published successfully.',
      } as const;

      return {
        message: statusMessages[publishedStatus],
        data: savedDebate,
      };
    } catch (error) {
      console.error('Debate creation error:', error);
      throw error;
    }
  }

  async adoptDebate(dataToSave: {
    type: 'club' | 'node';
    debateId: Types.ObjectId;
    clubId?: Types.ObjectId;
    nodeId?: Types.ObjectId;
    userId: Types.ObjectId;
  }) {
    try {
      console.log({ type: dataToSave.type });
      console.log({ user: dataToSave.userId });

      // Fetch the user's membership details based on the type
      let member;
      if (dataToSave.type === 'club') {
        if (!dataToSave.clubId) {
          throw new BadRequestException(
            'Club ID is required for club adoption',
          );
        }
        member = await this.clubMembersModel.findOne({
          club: new Types.ObjectId(dataToSave.clubId),
          user: new Types.ObjectId(dataToSave.userId),
        });
      } else if (dataToSave.type === 'node') {
        if (!dataToSave.nodeId) {
          throw new BadRequestException(
            'Node ID is required for node adoption',
          );
        }
        member = await this.nodeMembersModel.findOne({
          node: new Types.ObjectId(dataToSave.nodeId),
          user: new Types.ObjectId(dataToSave.userId),
        });
      }

      // Check if the user is a member
      if (!member) {
        throw new NotFoundException(
          `User is not a member of the specified ${dataToSave.type}`,
        );
      }

      // Determine if the user is authorized (admin/moderator) or a normal member
      const isAuthorized = ['admin', 'moderator'].includes(member.role);

      // Fetch the existing debate
      const existingDebate = await this.debateModel.findById(
        dataToSave.debateId,
      );

      if (!existingDebate) {
        throw new NotFoundException('Debate not found');
      }

      // Prepare base data for the new debate
      const debateData = {
        ...existingDebate.toObject(),

        _id: undefined, // Remove the _id to create a new document
        adoptedBy: dataToSave.userId,
        createdBy: dataToSave.userId,
        adoptedClubs: [],
        adoptedNodes: [],
        club: dataToSave.type == 'club' ? dataToSave.clubId : null,
        node: dataToSave.type == 'node' ? dataToSave.nodeId : null,
        adoptedDate: new Date(),
        adoptedParent: dataToSave.debateId,
        publishedDate: isAuthorized ? new Date() : null,
        publishedStatus: isAuthorized ? 'published' : 'proposed',
      };

      let updateOperation;
      let newDebate;

      if (dataToSave.type === 'club') {
        updateOperation = this.debateModel.findByIdAndUpdate(
          dataToSave.debateId,
          {
            $addToSet: {
              adoptedClubs: isAuthorized
                ? {
                    club: new Types.ObjectId(dataToSave.clubId),
                    date: new Date(),
                  }
                : [],
            },
          },
          { new: true },
        );

        // Create new debate for the club
        newDebate = new this.debateModel({
          ...debateData,
          club: isAuthorized ? new Types.ObjectId(dataToSave.clubId) : null,
        });
      } else if (dataToSave.type === 'node') {
        updateOperation = this.debateModel.findByIdAndUpdate(
          dataToSave.debateId,
          {
            $addToSet: {
              adoptedNodes: isAuthorized
                ? {
                    node: new Types.ObjectId(dataToSave.nodeId),
                    date: new Date(),
                  }
                : [],
            },
          },
          { new: true },
        );

        // Create new debate for the node
        newDebate = new this.debateModel({
          ...debateData,
          node: isAuthorized ? new Types.ObjectId(dataToSave.nodeId) : null,
        });
      }

      // Save the new debate and update the parent debate
      const [updatedParent, savedDebate] = await Promise.all([
        updateOperation,
        newDebate.save(),
      ]);

      if (!updatedParent || !savedDebate) {
        throw new InternalServerErrorException(
          'Failed to save or update debates',
        );
      }

      return {
        message: isAuthorized
          ? 'Debate adopted and published successfully'
          : 'Debate adoption proposed for review',
        data: savedDebate,
      };
    } catch (error) {
      console.error('Adoption error:', error);
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        'Error while adopting debate',
        error.message,
      );
    }
  }

  private async uploadFile(
    file: Express.Multer.File,
    section: 'node' | 'club',
  ) {
    try {
      // Uploading file to S3 or other cloud storage service
      const response = await this.s3FileUpload.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        section,
      );
      return response;
    } catch (error) {
      throw new BadRequestException(
        'Failed to upload file. Please try again later.',
      );
    }
  }
  async myDebates({
    entity,
    userId,
    entityId,
  }: {
    entity: 'club' | 'node'; // Define entity type
    userId: string;
    entityId: string; // This will hold either clubId or nodeId based on entity
  }) {
    try {
      // Build the base query object to find debates created by the user
      const query: any = {
        createdBy: new Types.ObjectId(userId), // Ensure the user is the creator of the debate
      };

      // Add the entity-specific filtering based on the 'entity' argument
      if (entity === 'club') {
        if (entityId) {
          query.club = new Types.ObjectId(entityId); // Filter by clubId
        } else {
          throw new Error('clubId is required for club entity type.');
        }
      } else if (entity === 'node') {
        if (entityId) {
          query.node = new Types.ObjectId(entityId); // Filter by nodeId
        } else {
          throw new Error('nodeId is required for node entity type.');
        }
      } else {
        throw new Error('Invalid entity type. Use "club" or "node".');
      }

      // Fetch debates matching the query
      const debates = await this.debateModel.find(query).exec();

      // Check if no debates are found and throw an error
      if (!debates || debates.length === 0) {
        throw new NotFoundException('No debates found for the given criteria.');
      }

      // Return the found debates with a success message
      return {
        message: 'Debates fetched successfully.',
        data: debates,
      };
    } catch (error) {
      console.error('Error fetching debates:', error);
      // Throw internal server error with details of the exception
      throw new InternalServerErrorException(
        'Error while fetching debates.',
        error.message,
      );
    }
  }

  // Fetch ongoing public global debates (not expired)
  async getOngoingPublicGlobalDebates(): Promise<Debate[]> {
    try {
      const currentTime = new Date(); // Current date and time
      const debates = await this.debateModel.find(); // Fetch all debates

      // Filter debates based on conditions
      const ongoingPublicGlobalDebates = debates.filter(
        (debate: CreateDebateDto) => {
          const startTime = new Date(debate.closingDate); // Debate start time
          const endTime = new Date(debate.openingDate); // Debate end time

          const isOngoing = startTime <= currentTime && endTime > currentTime;
          return debate.isPublic && isOngoing;
        },
      );

      // If no debates match the criteria, throw an error
      if (ongoingPublicGlobalDebates.length === 0) {
        throw new Error('No ongoing public global debates found.');
      }

      return ongoingPublicGlobalDebates;
    } catch (error) {
      throw error;
    }
  }

  async myDebatesByStatus({
    entity,
    userId,
    entityId,
  }: {
    entity: 'club' | 'node'; // Define entity type
    userId: string;
    entityId?: string; // This will hold either clubId or nodeId based on entity
  }) {
    try {
      // Build the base query object to find debates created by the user
      const query: any = {
        createdBy: new Types.ObjectId(userId), // Ensure the user is the creator of the debate
      };

      // Add the entity-specific filtering based on the 'entity' argument
      if (entity === 'club') {
        if (entityId) {
          query.club = new Types.ObjectId(entityId); // Filter by clubId
        } else {
          throw new Error('clubId is required for club entity type.');
        }
      } else if (entity === 'node') {
        if (entityId) {
          query.node = new Types.ObjectId(entityId); // Filter by nodeId
        } else {
          throw new BadRequestException(
            'nodeId is required for node entity type.',
          );
        }
      } else {
        throw new BadRequestException(
          'Invalid entity type. Use "club" or "node".',
        );
      }

      // Fetch all debates created by the user (no date filtering yet)
      const debates = await this.debateModel.find(query).exec();

      // Check if no debates are found and throw an error
      if (!debates || debates.length === 0) {
        throw new NotFoundException('No debates found for the given criteria.');
      }

      // Current date and time
      const currentTime = new Date();

      // Split debates into ongoing and expired based on date logic
      const ongoingDebates = debates.filter((debate) => {
        const openingDate = new Date(debate.openingDate);
        const closingDate = new Date(debate.closingDate);
        return openingDate <= currentTime && closingDate >= currentTime;
      });

      const expiredDebates = debates.filter((debate) => {
        const closingDate = new Date(debate.closingDate);
        return closingDate < currentTime;
      });

      // Return the ongoing and expired debates
      return {
        message: 'Debates fetched successfully.',
        ongoingDebates,
        expiredDebates,
      };
    } catch (error) {
      console.error('Error fetching debates:', error);
      // Throw internal server error with details of the exception
      throw new InternalServerErrorException(
        'Error while fetching debates.',
        error.message,
      );
    }
  }

  async getOngoingDebatesForEntity({
    entityId,
    entityType,
  }: {
    entityId: string;
    entityType: 'club' | 'node';
  }) {
    try {
      const currentTime = new Date(); // Current date and time
      const query: any = {};

      // If entity is a club or node, filter by that entity
      if (entityType === 'club') {
        query.club = new Types.ObjectId(entityId); // Use clubId for filtering
      } else if (entityType === 'node') {
        query.node = new Types.ObjectId(entityId); // Use nodeId for filtering
      }

      // Filter for ongoing debates (i.e., startTime <= currentTime and endTime > currentTime)
      const ongoingDebates = await this.debateModel
        .find({
          ...query,
          openingDate: { $lte: currentTime }, // Debate has started
          closingDate: { $gt: currentTime }, // Debate is not yet closed
        })
        .exec();

      // If no ongoing debates found, throw an exception
      if (!ongoingDebates || ongoingDebates.length === 0) {
        throw new Error(`No ongoing debates found for the ${entityType}.`);
      }

      // Return the ongoing debates
      return {
        message: `Ongoing debates fetched successfully for the ${entityType}.`,
        data: ongoingDebates,
      };
    } catch (error) {
      console.error('Error fetching ongoing debates:', error);
      throw new Error(`Error while fetching ongoing debates: ${error.message}`);
    }
  }

  async publishDebate(
    debateId: string,
    userId: string,
    entityId: string,
    entityType: 'node' | 'club',
  ): Promise<Debate> {
    try {
      // Find the debate by ID
      const debate = await this.debateModel.findById(debateId);
      if (!debate) {
        throw new NotFoundException('Debate not found.');
      }

      // Check if the entity type and ID match the debate's club or node
      if (
        (entityType === 'node' && !debate.node?.equals(entityId)) ||
        (entityType === 'club' && !debate.club?.equals(entityId))
      ) {
        throw new UnauthorizedException(
          'This debate does not belong to the specified entity.',
        );
      }

      // Check if the user is authorized to publish the debate
      const membershipModel: any =
        entityType === 'node' ? this.nodeMembersModel : this.clubMembersModel;

      const membership = await membershipModel.findOne({
        [entityType]: new Types.ObjectId(entityId),
        user: new Types.ObjectId(userId),
        role: 'admin', // Only admins can publish debates
        status: 'MEMBER',
      });

      if (!membership) {
        throw new UnauthorizedException(
          'You are not authorized to publish this debate.',
        );
      }

      // Update the debate's publishedStatus and publishedBy
      debate.publishedStatus = 'published';
      debate.publishedBy = new Types.ObjectId(userId);
      await debate.save();

      return debate;
    } catch (error) {
      throw error; // Let the caller handle errors
    }
  }
}
