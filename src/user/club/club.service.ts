import {
  Injectable,
  ConflictException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { CreateClubDto, UpdateClubDto } from './dto/club.dto';
import { Club } from 'src/shared/entities/club.entity';
import { UploadService } from 'src/shared/upload/upload.service';
import { ClubMembers } from 'src/shared/entities/clubmembers.entitiy';
import { ClubJoinRequests } from 'src/shared/entities/club-join-requests.entity';
import { randomUUID } from 'node:crypto';

@Injectable()
export class ClubService {
  //injecting club schema
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel(Club.name) private readonly clubModel: Model<Club>,

    @InjectModel(ClubMembers.name)
    private readonly clubMembersModel: Model<ClubMembers>,
    @InjectModel(ClubJoinRequests.name)
    private readonly clubJoinRequestsModel: Model<ClubJoinRequests>,
    private readonly s3FileUpload: UploadService,
  ) {}

  /*
  --------------------CREATING A CLUB----------------------------
  parameter {CreateClubDto} createClubDto - The data to create a new club
  @Returns {Promise<Club>} - The created club 
  */
  async createClub(createClubDto: CreateClubDto): Promise<Club> {
    console.log({ createClubDto });
    // Start a session for the transaction
    const session = await this.clubModel.db.startSession();

    try {
      session.startTransaction();

      // Upload images first - outside transaction since it's  a separate service
      const [profileImageUrl, coverImageUrl] = await Promise.all([
        this.uploadFile(createClubDto.profileImage),
        this.uploadFile(createClubDto.coverImage),
      ]);
      const link = randomUUID();
      // Create the club document
      const createdClub = new this.clubModel({
        ...createClubDto,
        profileImage: profileImageUrl,
        coverImage: coverImageUrl,
        link,
      });

      // Save the club within the transaction
      const clubResponse = await createdClub.save({ session });
      console.log({ clubResponse });
      // Create the club member document for admin
      const createClubMember = new this.clubMembersModel({
        club: clubResponse._id,
        user: clubResponse.createdBy,
        role: 'owner',
        status: 'MEMBER',
      });

      // Save the club member within the transaction
      await createClubMember.save({ session });

      // If both operations succeed, commit the transaction
      await session.commitTransaction();
      return clubResponse;
    } catch (error) {
      // If any operation fails, abort the transaction
      await session.abortTransaction();

      console.error('Error creating club:', error);

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to create club. Please try again later.',
      );
    } finally {
      // End the session
      await session.endSession();
    }
  }

  /*
  --------------------GETTING ALL CLUBS----------------------------

  @Returns {Promise<Club>} - All clubs
  */
  async getAllClubs(): Promise<Club[]> {
    try {
      return await this.clubModel.find().exec();
    } catch (error) {
      throw new BadRequestException(
        'Failed to fetch clubs. Please try again later.',
      );
    }
  }
  /*
  --------------------GETTING SINGLE CLUB----------------------------

  @Returns {Promise<Club>} - SINGLE CLUB
  */

  async getClubById(id: Types.ObjectId) {
    try {
      const club = await this.clubModel.findById(id).exec();
      const members = await this.clubMembersModel
        .find({ club: new Types.ObjectId(id) })
        .populate({
          path: 'user',
          select: '-password',
        });

      if (!club) {
        throw new NotFoundException('Club not found');
      }

      return { club, members };
    } catch (error) {
      console.log(error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to fetch club. Please try again later.',
      );
    }
  }
  /*
  --------------------UPDATING ONE CLUB----------------------------

  @Param {string} id - The id of the club to update  @ID to create a new club
  @Returns {Promise<Club>} - The updated  club 
  */
  async updateClub(id: string, updateClubDto: UpdateClubDto): Promise<Club> {
    try {
      const club = await this.clubModel.findById(id).exec();
      if (!club) {
        throw new NotFoundException('Club not found');
      }

      const updateData: any = { ...updateClubDto };

      // Only upload and update images if new files are provided
      if (updateClubDto.profileImage) {
        updateData.profileImage = await this.uploadFile(
          updateClubDto.profileImage,
        );
      }
      if (updateClubDto.coverImage) {
        updateData.coverImage = await this.uploadFile(updateClubDto.coverImage);
      }

      // Remove undefined values
      Object.keys(updateData).forEach(
        (key) => updateData[key] === undefined && delete updateData[key],
      );

      console.log({ updateData });

      const updatedClub = await this.clubModel
        .findByIdAndUpdate(id, updateData, { new: true })
        .exec();

      return updatedClub;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to update club. Please try again later.',
      );
    }
  }
  /*
  --------------------DELETE A CLUB----------------------------

  @Returns {Promise<Club>} - The deleted club 
  */

  async deleteClub(id: string) {
    try {
      const club = await this.clubModel.findById(id).exec();

      if (!club) {
        throw new NotFoundException('Club not found');
      }

      // Delete associated files first
      await this.cleanupFiles(club.profileImage.url, club.coverImage.url);

      // Then delete the club document
      const responce = await this.clubModel.findByIdAndDelete(id).exec();
      return responce;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        'Failed to delete club. Please try again later.',
      );
    }
  }

  /*
  --------------------GETTING  CLUBS OF THE SPECIFIED USER----------------------------
  @Param {string} id - The id of the user

  @Returns {Promise<Club>} - The deleted club 
  */

  async getAllClubsOfUser(userId: Types.ObjectId) {
    try {
      return await this.clubMembersModel
        .find({ user: userId })
        .populate('club')
        .populate('user', '-password')
        .exec();
    } catch (error) {
      console.log(error);
    }
  }

  /*
  --------------------REQUEST  CLUB TO JOIN----------------------------
  @Param USERDATA AND CLUBID

  @Returns {Promise<Club>} - REQUESTED OR JOINED CLUB 
  */

  async requestOrJoinClub(clubId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      // Check if the club exists
      const existingClub = await this.clubModel.findOne({
        _id: clubId,
      });

      if (!existingClub) {
        throw new NotFoundException('Club not found');
      }

      // Check if the user is already a member or has a pending request
      const existingMember = await this.clubMembersModel.findOne({
        club: clubId,
        user: userId,
      });

      // Handle existing member status checks
      if (existingMember) {
        switch (existingMember.status) {
          case 'MEMBER':
            throw new BadRequestException(
              'You are already a member of this club',
            );
          case 'BLOCKED':
            throw new BadRequestException(
              'You have been blocked from this club',
            );
          // Add other status cases if needed
        }
      }

      // Handle join process based on club privacy
      if (existingClub.isPublic) {
        // Direct join for public clubs
        const response = await this.clubMembersModel.create({
          club: existingClub._id,
          user: userId,
          role: 'member',
          status: 'MEMBER',
        });
        return response;
      } else {
        // Check if there's already a pending request
        const existingRequest = await this.clubJoinRequestsModel.findOne({
          club: clubId,
          user: userId,
          status: 'REQUESTED',
        });

        if (existingRequest) {
          throw new BadRequestException(
            'You already have a pending request for this club',
          );
        }

        // Create join request for private clubs
        const response = await this.clubJoinRequestsModel.create({
          club: existingClub._id,
          user: userId,
          status: 'REQUESTED',
          role: 'member',
        });
        return response;
      }
    } catch (error) {
      // Properly handle and propagate errors
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }

      console.error('Club join error:', error);
      throw new BadRequestException(
        'Failed to process club join request. Please try again later.',
      );
    }
  }

  /**
   * Cancel a pending join request for a club.
   * @param clubId - The id of the club to cancel the join request for
   * @param userId - The id of the user making the request
   * @returns The deleted join request document
   * @throws `BadRequestException` if the clubId is invalid
   * @throws `NotFoundException` if the user has not requested to join the club
   */
  async cancelJoinRequest(clubId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      if (!clubId) {
        throw new BadRequestException('Invalid clubId');
      }

      const response = await this.clubJoinRequestsModel.findOneAndDelete({
        club: clubId,
        user: userId,
        status: 'REQUESTED',
      });

      if (!response) {
        throw new NotFoundException('You have not requested to join this club');
      }

      return response;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      console.error('Error while canceling join request:', error);
      throw new BadRequestException(
        'Failed to cancel join request. Please try again later.',
      );
    }
  }

  /* -------------------------REQUEST FOR SINGLE CLUBS --------------------------- */
  // async getAllRequestsOfClub(clubId: Types.ObjectId) {
  //   try {
  //     const requests = await this.clubJoinRequestsModel
  //       .find({ club: clubId })

  //       .populate('club')
  //       .populate('user')
  //       .exec();
  //     return requests;
  //   } catch (error) {
  //     console.log(error);
  //     throw new BadRequestException(
  //       'Failed to fetch club join requests. Please try again later.',
  //     );
  //   }
  // }

  /*-------------------------CECKING THE STATUS OF THE USER OF A CLUB ---------------------------*/

  async checkStatus(clubId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      let status = 'VISITOR';

      const isMember = await this.clubMembersModel
        .findOne({ club: clubId, user: userId })
        .populate('club')
        .populate('user')
        .exec();

      if (isMember) {
        status = isMember.status;
        return {
          status,
        };
      }
      const isRequested = await this.clubJoinRequestsModel.findOne({
        club: clubId,
        user: userId,
      });
      if (isRequested) {
        status = isRequested.status;
        return {
          status,
        };
      }
      return { status };
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to fetch club join requests. Please try again later.',
      );
    }
  }

  /* ------------------GETTING ALL THE MEMBERS OF THE SINGLE CLUB------------------------- */
  async getAllMembersOfClub(clubId: Types.ObjectId) {
    try {
      const members = await this.clubMembersModel
        .find({ club: clubId })
        .populate({
          path: 'user',
          select: '-password',
        })
        .exec();
      return members;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to fetch club members. Please try again later.',
      );
    }
  }
  /*----------------SEARCHING FOR MEMBER OF THE SINGLE CLUB ------------------------*/
  async searchMemberOfClub(clubId: Types.ObjectId, search: string) {
    // Create a case-insensitive search regex
    const searchRegex = new RegExp(search, 'i');

    // Aggregate pipeline to search club members and their user information
    const members = await this.clubMembersModel.aggregate([
      // Match documents with the specified clubId
      {
        $match: {
          club: clubId,
        },
      },
      // Lookup to join with memmbers collection
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userDetails',
        },
      },
      // Unwind the userDetails array (converts array to object)
      {
        $unwind: '$userDetails',
      },
      // Match documents where any of the specified user fields match the search string
      {
        $match: {
          $or: [
            { 'userDetails.userName': { $regex: searchRegex } },
            { 'userDetails.email': { $regex: searchRegex } },
            { 'userDetails.firstName': { $regex: searchRegex } },
            { 'userDetails.lastName': { $regex: searchRegex } },
          ],
        },
      },
      // Project only the needed fields
      {
        $project: {
          _id: 1,
          role: 1,
          status: 1,
          pinned: 1,
          user: {
            _id: '$userDetails._id',
            userName: '$userDetails.userName',
            email: '$userDetails.email',
            firstName: '$userDetails.firstName',
            lastName: '$userDetails.lastName',
            profileImage: '$userDetails.profileImage',
            isBlocked: '$userDetails.isBlocked',
          },
        },
      },
    ]);

    return members;
  }

  /*----------------------ACCEPTING OR REJECTING THE REQUEST---------------

  @PARAM groupId @user :userId*/
  async acceptOrRejectRequest(
    requestId: Types.ObjectId,
    userId: Types.ObjectId,
    clubId: Types.ObjectId,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    try {
      //in here i need to check the user is a admin of this club

      const isAdminOrModerator = await this.clubMembersModel.findOne({
        club: clubId,
        user: userId,
        $or: [{ role: 'admin' }, { role: 'moderator' }, { role: 'owner' }],
      });

      if (!isAdminOrModerator) {
        throw new BadRequestException(
          'You are not authorized to perform this action',
        );
      }

      // object based on status to query
      const updateData: any = { status };
      if (status === 'REJECTED') {
        const response = await this.clubJoinRequestsModel.findOneAndDelete({
          _id: requestId,
        });

        return response;
      }

      const response = await this.clubJoinRequestsModel.findOneAndUpdate(
        { _id: requestId },
        updateData,
        { new: true },
      );

      // If accepted, create club member
      if (response.status === 'ACCEPTED') {
        const createClubMember = new this.clubMembersModel({
          club: response.club,
          user: response.user,
          role: 'member',
          status: 'MEMBER',
        });
        await createClubMember.save();
      }

      return response;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to process club join request. Please try again later.',
      );
    }
  }

  /*------------------------PINNING CLUB------------------------------ */
  /**
   * Pins a node, and shifts all nodes that were pinned after it one position up.
   * If the user already has 3 pinned nodes, the oldest pinned node will be unpinned.
   * @param clubId The id of the node to pin
   * @param userId The id of the user to pin the node for
   * @returns The node that was pinned
   * @throws `BadRequestException` if the node memeber is not found, or the node is already pinned
   */
  async pinNode(clubId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      const pinnedClubs = await this.clubMembersModel
        .find({ user: userId, pinned: { $ne: null } })
        .sort({ pinned: 1 });

      if (pinnedClubs.length >= 3) {
        const oldestPinnedClub = pinnedClubs.pop();
        if (oldestPinnedClub) {
          oldestPinnedClub.pinned = null;
          await oldestPinnedClub.save();
        }
      }

      for (const club of pinnedClubs) {
        club.pinned = (club.pinned + 1) as 1 | 2 | 3;
        await club.save();
      }

      const clubTopin = await this.clubMembersModel.findOneAndUpdate(
        { club: clubId, user: userId },
        { pinned: 1 },
        { new: true },
      );

      if (!clubTopin) {
        throw new Error('node memeber not found');
      }

      return clubTopin;
    } catch (error) {
      throw new BadRequestException(
        'Failed to pin node. Please try again later.',
      );
    }
  }

  /*------------------------UNPINNING CLUB------------------------------ */
  async unpinNode(clubId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      const clubToUnpin = await this.clubMembersModel.findOneAndUpdate(
        { club: clubId, user: userId },
        { pinned: null },
        { new: true },
      );

      if (!clubToUnpin) {
        throw new Error('node memeber not found');
      }

      const pinnedClubs = await this.clubMembersModel
        .find({ user: userId, pinned: { $ne: null } })
        .sort({ pinned: 1 });

      for (const club of pinnedClubs) {
        club.pinned = (club.pinned - 1) as 1 | 2 | 3;
        await club.save();
      }

      return clubToUnpin;
    } catch (error) {
      throw new BadRequestException(
        'Failed to unpin node. Please try again later.',
      );
    }
  }
  /*--------------------LEAVING CLUB API ----------------------------*/
  async leaveClub(clubId: Types.ObjectId, userId: Types.ObjectId) {
    // Starting a session for transaction
    const session = await this.connection.startSession();

    try {
      // Starting transaction
      session.startTransaction();

      // Performing both operations within the transaction
      const membershipResponse = await this.clubMembersModel.findOneAndDelete(
        {
          club: clubId,
          user: userId,
        },
        { session },
      );

      const joinRequestResponse =
        await this.clubJoinRequestsModel.findOneAndDelete(
          {
            club: clubId,
            user: userId,
          },
          { session },
        );

      // If user was neither a member nor had a join request
      if (!membershipResponse && !joinRequestResponse) {
        await session.abortTransaction();
        throw new BadRequestException('You are not a member of this club');
      }

      // commiting transaction
      await session.commitTransaction();

      return {
        membershipResponse,
        joinRequestResponse,
        message: 'Successfully left the club',
      };
    } catch (error) {
      // If any error occurs, transaction is aborted
      await session.abortTransaction();

      console.error('Leave club error:', error);

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException(
        'Failed to process club leave request. Please try again later.',
      );
    } finally {
      // session ended
      await session.endSession();
    }
  }
  // --------------------------UTIL FUNCTIONS------------------------------
  //handling file uploads
  private async uploadFile(file: Express.Multer.File) {
    try {
      //uploading file
      const response = await this.s3FileUpload.uploadFile(
        file.buffer,
        file.originalname,
        file.mimetype,
        'club',
      );
      return response;
    } catch (error) {
      throw new BadRequestException(
        'Failed to upload file. Please try again later.',
      );
    }
  }

  //handling file delete

  private async cleanupFiles(...urls: string[]) {
    try {
      const deletePromises = urls
        .filter((url) => url) // Filter out null/undefined values
        .map((url) => this.s3FileUpload.deleteFile(url));

      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error cleaning up files:', error);
    }
  }
  /* -------------------------REQUEST FOR SINGLE CLUBS --------------------------- */
  async getAllRequestsOfClub(clubId: Types.ObjectId) {
    try {
      const requests = await this.clubJoinRequestsModel
        .find({ club: clubId })

        .populate('club')
        .populate('user')
        .exec();
      return requests;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to fetch club join requests. Please try again later.',
      );
    }
  }

  /**
   * Retrieves all join requests made by a user.
   * @param userId - The id of the user to retrieve join requests for.
   * @returns A promise that resolves to an array of join requests, populated with club and user details.
   * @throws `BadRequestException` if there is an error while trying to get join requests.
   */
  async getAllRequestsOfUser(userId: Types.ObjectId) {
    try {
      const requests = await this.clubJoinRequestsModel
        .find({ user: userId, status: 'REQUESTED' })
        .populate('club')
        .populate('user', '-password')
        .exec();
      return requests;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Failed to fetch user join requests. Please try again later.',
      );
    }
  }
}
