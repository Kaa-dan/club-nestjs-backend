import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RulesRegulations } from 'src/shared/entities/rules-requlations.entity';

@Injectable()
export class RulesRegulationsService {
  constructor(
    @InjectModel(RulesRegulations.name)
    private readonly rulesregulationModel: Model<RulesRegulations>,
  ) {}

  async getAllRulesRegulations() {
    try {
      return await this.rulesregulationModel.find().exec();
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while fetching rules-regulations',
        error,
      );
    }
  }
}
