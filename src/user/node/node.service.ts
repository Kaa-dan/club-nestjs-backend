import { Injectable } from '@nestjs/common';
import { CreateNodeDto } from './dto/create-node.dto';
import { UpdateNodeDto } from './dto/update-node.dto';
import { Node_, NodeSchema } from 'src/shared/entities/node.entity';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { UploadService } from 'src/shared/upload/upload.service';
import { SkipAuth } from 'src/decorators/skip-auth.decorator';
import { NodeJoinRequest } from 'src/shared/entities/node-member-requests.entity';

@Injectable()
export class NodeService {
  constructor(
    @InjectModel(Node_.name) private readonly nodeModel: Model<Node_>,
    @InjectModel(NodeJoinRequest.name)
    private readonly nodeJoinRequestModel: Model<NodeJoinRequest>,
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
      'node',
    );
    const coverImageUpload = this.uploadService.uploadFile(
      coverImage.buffer,
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
    return node;
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
    return requests;
  }

  async updateNodeJoinRequest(
    nodeId: string,
    userId: string,
    status: 'accepted' | 'rejected',
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
    if (status === 'accepted') {
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
        'node',
      );
      const profileImageResult = await profileImageUpload;
      node.profileImage = profileImageResult.url;
    }
    if (coverImage) {
      const coverImageUpload = this.uploadService.uploadFile(
        coverImage.buffer,
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
}
