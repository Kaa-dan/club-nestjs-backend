import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { Node_, NodeSchema } from 'src/shared/entities/node.entity';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { UploadService } from 'src/shared/upload/upload.service';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { NodeJoinRequest } from 'src/shared/entities/node-join-requests.entity';
import { NodeMembers } from 'src/shared/entities/node-members.entity';

@Injectable()
export class NodeService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('nodes') private readonly nodeModel: Model<Node_>,
    @InjectModel('nodejoinrequests')
    private readonly nodeJoinRequestModel: Model<NodeJoinRequest>,
    @InjectModel(NodeMembers.name) private nodeMembersModel: Model<NodeMembers>,
    private readonly uploadService: UploadService,
  ) { }

  /**
   * Creates a new node in the database.
   * @param createNodeDto Node data to be created.
   * @param userId The id of the user who is creating the node.
   * @returns The created node object.
   * @throws BadRequestException if there is an error while creating the node.
   * @throws ConflictException if there is an error with the database.
   */
  async createNode(createNodeDto: CreateNodeDto, userId: Types.ObjectId) {
    const session = await this.nodeModel.db.startSession();
    try {
      session.startTransaction();
      const { name, about, description, location, profileImage, coverImage } =
        createNodeDto;
      const profileImageUpload = this.uploadService.uploadFile(
        profileImage.buffer,
        profileImage.originalname,
        profileImage.mimetype,
        'node',
      );
      const coverImageUpload = this.uploadService.uploadFile(
        coverImage.buffer,
        coverImage.originalname,
        coverImage.mimetype,
        'node',
      );
      const [profileImageResult, coverImageResult] = await Promise.all([
        profileImageUpload,
        coverImageUpload,
      ]);
      const createdNode = new this.nodeModel({
        name,
        about,
        description,
        location,
        profileImage: profileImageResult,
        coverImage: coverImageResult,
        createdBy: userId,
      });
      const nodeResponse = await createdNode.save({ session });

      const createNodeMember = new this.nodeMembersModel({
        node: nodeResponse._id,
        user: nodeResponse.createdBy,
        role: 'admin',
        status: 'MEMBER',
      });

      await createNodeMember.save({ session });

      await session.commitTransaction();
      return nodeResponse;
    } catch (error) {
      console.log(error, 'error');
      await session.abortTransaction();

      if (error instanceof ConflictException) {
        throw error;
      }

      throw new BadRequestException(
        'Error while trying to add node. Please try again later.',
      );
    } finally {
      await session.endSession();
    }
  }

  async findAllNode() {
    try {
      return await this.nodeModel.find().exec();
    } catch (error) {
      throw new BadRequestException(
        'Error while trying to get nodes. Please try again later.',
      );
    }
  }

  /**
   * Retrieves a single node by its id
   * @param nodeId The id of the node to retrieve
   * @returns The retrieved node
   * @throws `BadRequestException` if the node is not found
   */
  async findOne(nodeId: string) {
    try {
      console.log({ nodeId });
      const node = await this.nodeModel.findById(nodeId);

      if (!node) {
        throw new BadRequestException(
          'Failed to get node. Please try again later.',
        );
      }
      const members = await this.nodeMembersModel
        .find({
          node: new Types.ObjectId(nodeId),
        })
        .populate('user', '-password')
        .exec();

      return {
        success: true,
        message: 'Successfully fetched node',
        data: { node, members },
      };
    } catch (error) {
      throw new BadRequestException(
        'Error while trying to get node. Please try again later.',
      );
    }
  }

  /**
   * Retrieves all nodes that a user is a member of.
   * @param userId The id of the user to retrieve nodes for
   * @returns An array of nodes that the user is a member of, with the node and user populated
   * @throws `BadRequestException` if there is an error while trying to get nodes
   */
  async getAllNodesOfUser(userId: Types.ObjectId) {
    try {
      return await this.nodeMembersModel
        .find({ user: userId })
        .populate('node')
        .populate('user', '-password')
        .exec();
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(
        'Error while trying to get nodes. Please try again later.',
      );
    }
  }

  /**
   * Requests to join a node.
   * @param nodeId The id of the node to request to join
   * @param userId The id of the user making the request
   * @returns The newly created node join request
   * @throws `BadRequestException` if the node is not found,
   * or if the user is already a member of the node,
   * or if the user has been blocked from the node,
   * or if the user has already requested to join the node.
   * @throws `NotFoundException` if the node is not found.
   */
  async requestToJoin(nodeId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      const existingNode = await this.nodeModel.findById(nodeId);

      if (!existingNode) {
        throw new NotFoundException('Node not found');
      }

      const existingMember = await this.nodeMembersModel.findOne({
        node: nodeId,
        user: userId,
      });

      if (existingMember) {
        switch (existingMember.status) {
          case 'MEMBER':
            throw new BadRequestException(
              'You are already a member of this node',
            );
          case 'BLOCKED':
            throw new BadRequestException(
              'You have been blocked from this node',
            );
        }
      }

      const existingRequest = await this.nodeJoinRequestModel.findOne({
        node: nodeId,
        user: userId,
        status: 'REQUESTED',
      });

      if (existingRequest) {
        throw new ConflictException('You have already requested to join this node');
      }

      const response = await this.nodeJoinRequestModel.create({
        node: existingNode._id,
        user: userId,
        status: 'REQUESTED',
      });

      return response;
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException('You have already requested to join this node')
      }
      console.log(error, "error")
      throw new BadRequestException('Error while trying to request to join. Please try again later.');
    }
  }


  /**
   * Cancel a join request made by a user to a node.
   * @param nodeId The ID of the node the user is canceling the request for.
   * @param userId The ID of the user canceling the request.
   * @returns The deleted join request.
   * @throws NotFoundException if the user has not requested to join the node.
   * @throws BadRequestException if there is an error while canceling the request.
   */
  async cancelJoinRequest(nodeId: Types.ObjectId, userId: Types.ObjectId) {
    try {
      if (!nodeId) {
        throw new BadRequestException('Please provide node id');
      }

      const response = await this.nodeJoinRequestModel.findOneAndDelete({
        node: nodeId,
        user: userId,
        status: 'REQUESTED',
      });

      if (!response) {
        throw new NotFoundException('You have not requested to join this node');
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
      throw new BadRequestException('Failed to cancel join request. Please try again later.');
    }
  }

  /**
   * Retrieves all join requests for a specific node.
   * @param nodeId - The ID of the node for which to retrieve join requests.
   * @returns A promise that resolves to an array of join requests, populated with node and user details.
   * @throws BadRequestException if there is an error while trying to get join requests.
   */
  async getAllJoinRequestsOfNode(nodeId: Types.ObjectId) {
    try {
      const requests = await this.nodeJoinRequestModel
        .find({ node: nodeId })
        .populate('node')
        .populate('user', '-password')
        .exec();
      return requests;
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(
        'Error while trying to get node join requests. Please try again later.',
      );
    }
  }

  /**
   * Retrieves all join requests made by a specific user.
   * @param userId - The ID of the user for which to retrieve join requests.
   * @returns A promise that resolves to an array of join requests, populated with node and user details.
   * @throws BadRequestException if there is an error while trying to get user join requests.
   */
  async getAllJoinRequestsOfUser(userId: Types.ObjectId) {
    try {
      const request = await this.nodeJoinRequestModel
        .find({ user: userId, status: 'REQUESTED' })
        .populate('node')
        .populate('user', '-password')
        .exec();
      return request;
    } catch (error) {
      console.log(error);
      throw new BadRequestException(
        'Error while trying to get user join requests. Please try again later.',
      )
    }
  }

  /**
   * Accepts or rejects a node join request.
   * @param nodeId - The ID of the node for which the request was made.
   * @param userId - The ID of the user who is accepting or rejecting the request.
   * @param requestId - The ID of the request to accept or reject.
   * @param status - The status to set the request to - either 'ACCEPTED' or 'REJECTED'.
   * @returns A promise that resolves to the updated join request.
   * @throws BadRequestException if there is an error while trying to accept or reject the request.
   */
  async acceptOrRejectRequest(
    nodeId: Types.ObjectId,
    userId: Types.ObjectId,
    requestId: Types.ObjectId,
    status: 'ACCEPTED' | 'REJECTED',
  ) {
    try {
      console.log('ddd', status)
      const updateData: any = { status };
      if (status === 'REJECTED') {
        const response = await this.nodeJoinRequestModel.findOneAndDelete({
          _id: requestId,
        })

        return response;
      }

      const response = await this.nodeJoinRequestModel.findOneAndUpdate(
        { _id: requestId },
        updateData,
        { new: true },
      );

      console.log(response, 'response');

      if (response.status === 'ACCEPTED') {
        const createNodeMember = new this.nodeMembersModel({
          node: response.node,
          user: response.user,
          role: 'member',
          status: 'MEMBER',
        });

        await createNodeMember.save();
      }

      return response;
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(
        'Error while trying to accept or reject request. Please try again later.',
      );
    }
  }

  /**
   * Updates a node with the given data.
   * @param id - The ID of the node to update.
   * @param updateNodeDto - The data to update the node with.
   * @returns A promise that resolves to the updated node.
   * @throws BadRequestException if there is an error while trying to update the node.
   * @throws NotFoundException if the node is not found.
   */
  async updateNode(id: Types.ObjectId, updateNodeDto: UpdateNodeDto) {
    try {
      const node = await this.nodeModel.findById(id);
      if (!node) {
        throw new NotFoundException('Node not found');
      }

      const { name, about, description, location, profileImage, coverImage } =
        updateNodeDto;

      if (profileImage) {
        const profileImageUpload = this.uploadService.uploadFile(
          profileImage.buffer,
          profileImage.originalname,
          profileImage.mimetype,
          'node',
        );
        const profileImageResult = await profileImageUpload;
        node.profileImage = profileImageResult;
      }

      if (coverImage) {
        const coverImageUpload = this.uploadService.uploadFile(
          coverImage.buffer,
          coverImage.originalname,
          coverImage.mimetype,
          'node',
        );
        const coverImageResult = await coverImageUpload;
        node.coverImage = coverImageResult;
      }

      if (name !== undefined) node.name = name;
      if (about !== undefined) node.about = about;
      if (description !== undefined) node.description = description;
      if (location !== undefined) node.location = location;

      // node.modules = modules.map((module));
      const updatedNode = await node.save();
      return updatedNode;
    } catch (error) {
      console.log(error, 'error');
      throw new BadRequestException(
        'Error while trying to update node. Please try again later.',
      );
    }
  }

  /**
   * Allows a user to leave a node by deleting their membership and any join requests.
   * Initiates a database transaction to ensure both operations are atomic.
   * @param nodeId - The ID of the node to leave.
   * @param userId - The ID of the user leaving the node.
   * @returns An object containing the responses of the membership and join request deletions, along with a success message.
   * @throws `BadRequestException` if the user is not a member of the node or if an error occurs during the transaction.
   */
  async leaveNode(nodeId: Types.ObjectId, userId: Types.ObjectId) {
    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const membershipResponse = await this.nodeMembersModel.findOneAndDelete(
        {
          node: nodeId,
          user: userId,
        },
        { session },
      );

      const joinRequestResponse =
        await this.nodeJoinRequestModel.findOneAndDelete(
          {
            node: nodeId,
            user: userId,
          },
          { session },
        );

      if (!membershipResponse && !joinRequestResponse) {
        throw new BadRequestException('You are not a member of this node');
      }

      await session.commitTransaction();

      return {
        membershipResponse,
        joinRequestResponse,
        message: 'Successfully left node',
      };
    } catch (error) {
      console.log(error, 'error');
      await session.abortTransaction();
      throw new BadRequestException(
        'Error while trying to leave node. Please try again later.',
      );
    } finally {
      await session.endSession();
    }
  }

  /**
   * Checks the status of the given user in the given node.
   * The status can be one of the following:
   * - 'VISITOR': The user is not a member of the node.
   * - 'MEMBER': The user is a member of the node.
   * - 'REQUESTED': The user has requested to join the node, but has not yet been accepted.
   * @param userId The ID of the user to check the status of.
   * @param nodeId The ID of the node to check the status of.
   * @returns A promise that resolves to an object with a single property, `status`, which is a string indicating the status of the user in the node.
   */
  async checkStatus(userId: Types.ObjectId, nodeId: Types.ObjectId) {
    try {
      let status = 'VISITOR';

      const isMember = await this.nodeMembersModel
        .findOne({ node: nodeId, user: userId })
        .populate('node')
        .populate('user')
        .exec();

      if (isMember) {
        status = isMember.status;
        return {
          status,
        };
      }
      const isRequested = await this.nodeJoinRequestModel.findOne({
        node: nodeId,
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
        'Failed to fetch node join requests. Please try again later.',
      );
    }
  }
  /**
   * Pins a node, and shifts all nodes that were pinned after it one position up.
   * If the user already has 3 pinned nodes, the oldest pinned node will be unpinned.
   * @param nodeId The id of the node to pin
   * @param userId The id of the user to pin the node for
   * @returns The node that was pinned
   * @throws `BadRequestException` if the node memeber is not found, or the node is already pinned
   */
  async pinNode(nodeId: string, userId: string) {
    try {
      const pinnedNodes = await this.nodeMembersModel
        .find({ user: userId, pinned: { $ne: null } })
        .sort({ pinned: 1 });

      if (pinnedNodes.length >= 3) {
        const oldestPinnedNode = pinnedNodes.pop();
        if (oldestPinnedNode) {
          oldestPinnedNode.pinned = null;
          await oldestPinnedNode.save();
        }
      }

      for (const node of pinnedNodes) {
        node.pinned = (node.pinned + 1) as 1 | 2 | 3;
        await node.save();
      }

      const nodeToPin = await this.nodeMembersModel.findOneAndUpdate(
        { node: nodeId, user: userId },
        { pinned: 1 },
        { new: true },
      );

      if (!nodeToPin) {
        throw new Error('node memeber not found');
      }

      return nodeToPin;
    } catch (error) {
      throw new BadRequestException(
        'Failed to pin node. Please try again later.',
      );
    }
  }

  /**
   * Unpin a node, and shift all nodes that were pinned after it one position up.
   * @param nodeId The id of the node to unpin
   * @param userId The id of the user to unpin the node for
   * @returns The node that was unpinned
   * @throws `BadRequestException` if the node memeber is not found, or the node is already unpinned
   */
  async unpinNode(nodeId: string, userId: string) {
    try {
      const nodeToUnpin = await this.nodeMembersModel.findOne({
        node: nodeId,
        user: userId,
      });
      if (!nodeToUnpin || nodeToUnpin.pinned === null) {
        throw new Error('node memeber not found or already unpinned');
      }

      const unpinnedPosition = nodeToUnpin.pinned;
      nodeToUnpin.pinned = null;
      await nodeToUnpin.save();

      const nodeToUpdate = await this.nodeMembersModel.find({
        user: userId,
        pinned: { $gt: unpinnedPosition },
      });

      for (const node of nodeToUpdate) {
        node.pinned = (node.pinned - 1) as 1 | 2 | 3;
        await node.save();
      }

      return nodeToUnpin;
    } catch (error) {
      throw new BadRequestException(
        'Failed to unpin node. Please try again later.',
      );
    }
  }

  async getNodeMembers(nodeId: Types.ObjectId) {
    try {
      return await this.nodeMembersModel
        .find({ node: nodeId })
        .populate('user', '-password')
        .exec();
    } catch (error) {
      throw new BadRequestException(
        'Failed to get node members. Please try again later.',
      );
    }
  }
}
