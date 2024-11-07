import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { Node_, NodeSchema } from 'src/shared/entities/node.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { UploadService } from 'src/shared/upload/upload.service';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { NodeJoinRequest } from 'src/shared/entities/node-join-requests.entity';
import { NodeMembers } from 'src/shared/entities/node-members.entity';

@Injectable()
export class NodeService {
  constructor(
    @InjectModel('nodes') private readonly nodeModel: Model<Node_>,
    @InjectModel('nodejoinrequests')
    private readonly nodeJoinRequestModel: Model<NodeJoinRequest>,
    @InjectModel(NodeMembers.name) private nodeMembersModel: Model<NodeMembers>,
    private readonly uploadService: UploadService,
  ) {}

  async create(createNodeDto: CreateNodeDto, userId: string) {
    const {
      name,
      about,
      description,
      location,
      profileImage,
      coverImage,
      modules,
    } = createNodeDto;
    const profileImageUpload = this.uploadService.uploadFile(
      profileImage.buffer,
      profileImage.filename,
      profileImage.mimetype,
      'node',
    );
    const coverImageUpload = this.uploadService.uploadFile(
      coverImage.buffer,
      coverImage.filename,
      coverImage.mimetype,
      'node',
    );
    const [profileImageResult, coverImageResult] = await Promise.all([
      profileImageUpload,
      coverImageUpload,
    ]);
    const node = new this.nodeModel({
      name,
      about,
      description,
      location,
      profileImage: profileImageResult.url,
      coverImage: coverImageResult.url,
      creator: userId,
      modules,
      members: [
        {
          role: 'admin',
          user: userId,
          designation: 'demo',
        },
      ],
    });
    await node.save();
    return 'Successfully added node';
  }

  @SkipAuth()
  async findAll() {
    const nodes = await this.nodeModel.find();
    return nodes;
  }

  async findOne(nodeId: string) {
    const node = await this.nodeModel.findById(nodeId);
    return {
      success: true,
      message: 'Successfully fetched node',
      data: node,
    };
  }

  async requestToJoin(nodeId: string, userId: string) {
    const node = await this.nodeModel.findById(nodeId);
    if (node.members.find((member) => member.user === userId)) {
      return {
        success: false,
        message: 'You are already a member of this node',
      };
    }
    const existingRequest = await this.nodeJoinRequestModel.findOne({
      node: nodeId,
      user: userId,
    });
    if (existingRequest) {
      return {
        success: false,
        message: 'You have already requested to join this node',
      };
    }
    const request = new this.nodeJoinRequestModel({
      node: nodeId,
      user: userId,
    });
    await request.save();
    await node.save();
    return {
      success: true,
      message: 'Successfully requested to join node',
    };
  }

  async getAllJoinRequests(nodeId: string) {
    const requests = await this.nodeJoinRequestModel
      .find({ node: nodeId })
      .populate(['user']);
    return {
      success: true,
      message: 'Successfully fetched requests',
      data: requests,
    };
  }

  async updateNodeJoinRequest(
    nodeId: string,
    userId: string,
    status: 'accept' | 'reject',
  ) {
    const node = await this.nodeModel.findById(nodeId);
    const request = await this.nodeJoinRequestModel.findOne({
      node: nodeId,
      user: userId,
    });
    if (!request) {
      return {
        success: false,
        message: 'Request not found',
      };
    }
    if (status === 'accept') {
      node.members.push({
        role: 'member',
        user: userId,
        designation: 'demo',
      });
    }
    await this.nodeJoinRequestModel.deleteOne({
      node: nodeId,
      user: userId,
    });
    await node.save();
    return {
      success: true,
      message: 'Successfully updated request',
    };
  }

  async update(id: string, updateNodeDto: UpdateNodeDto) {
    const node = await this.nodeModel.findById(id);
    if (!node) {
      return {
        success: false,
        message: 'Node not found',
      };
    }
    const {
      name,
      about,
      description,
      location,
      profileImage,
      coverImage,
      modules,
    } = updateNodeDto;
    if (profileImage) {
      const profileImageUpload = this.uploadService.uploadFile(
        profileImage.buffer,
        profileImage.filename,
        profileImage.mimetype,
        'node',
      );
      const profileImageResult = await profileImageUpload;
      node.profileImage = profileImageResult.url;
    }
    if (coverImage) {
      const coverImageUpload = this.uploadService.uploadFile(
        coverImage.buffer,
        coverImage.filename,
        coverImage.mimetype,
        'node',
      );
      const coverImageResult = await coverImageUpload;
      node.coverImage = coverImageResult.url;
    }
    node.name = name;
    node.about = about;
    node.description = description;
    node.location = location;
    // node.modules = modules.map((module));
    await node.save();
    return {
      success: true,
      message: 'Successfully updated node',
    };
  }

  remove(id: number) {
    return `This action removes a #${id} node`;
  }
  // ------------------------Get user status for the specified club ------------------------------
  async getUserStatus(userId: Types.ObjectId, nodeId: Types.ObjectId) {
    try {
      let status = 'VISITOR';

      const isMember = await this.nodeMembersModel
        .findOne({ club: nodeId, user: userId })
        .populate('club')
        .populate('user')
        .exec();

      if (isMember) {
        status = isMember.status;
        return {
          status,
        };
      }
      const isRequested = await this.nodeJoinRequestModel.findOne({
        club: nodeId,
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

  
}
