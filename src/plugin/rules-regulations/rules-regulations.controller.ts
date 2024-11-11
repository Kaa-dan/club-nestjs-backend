import {
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  Post,
} from '@nestjs/common';
import { RulesRegulationsService } from './rules-regulations.service';

@Controller('rules-regulations')
export class RulesRegulationsController {
  constructor(
    private readonly rulesRegulationsService: RulesRegulationsService,
  ) {}
  /*---------------GET ALL RULES-REGULATIONS
  
  @Param :createRulesRegulationsDto
  @return :RulesRegulations*/
  @Get('get-all-rules-regulations')
  getAllRulesRegulations() {
    return 'All rules-regulations';
  }

  /* -----------------------------CREATE RULES AND REGULATIONS
  @Param :createRulesRegulationsDto
  @Res :RulesRegulations
  @description :Create a new rules-regulations
  @Req:user_id */

  @Post('create-rules-regulations')
  async createRulesRegulations(
    @Body() createRulesRegulationsDto: CreateRulesRegulationsDto,
  ) {
    try {
      return await this.rulesRegulationsService.createRulesRegulations();
    } catch (error) {
      throw new InternalServerErrorException(
        'Error while creating rules-regulations',
        error,
      );
    }
  }
}
