import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Node_} from 'src/shared/entities/node.entity';
import { Club } from '../entities/club.entity';

@Injectable()
export class SearchService {
    constructor(
        @InjectModel('nodes') private readonly nodeModel: Model<Node>,
        @InjectModel(Club.name) private readonly clubModel: Model<Club>
    ) { }

    async search(term: string, tag?: string) {
        try {

            if (tag === 'node') {
                const nodes = await this.nodeModel.find({ name: { $regex: term, $options: 'i' } });
                return {
                    data: {
                        nodes
                    }
                }
            }

            if (tag === 'club') {
                const clubs = await this.clubModel.find({ name: { $regex: term, $options: 'i' } });
                return {
                    data: {
                        clubs
                    }
                }
            }


            const nodes = await this.nodeModel.find({ name: { $regex: term, $options: 'i' } });
            const clubs = await this.clubModel.find({ name: { $regex: term, $options: 'i' } });
            return {
                data: {
                    nodes,
                    clubs
                }
            }

        } catch (error) {
            console.log("e",error)
            throw new BadRequestException('Failed to search')
        }
    }
}
