import { PartialType } from '@nestjs/swagger';
import { CreateAdoptContributionDto } from './create-adopt-contribution.dto';

export class UpdateAdoptContributionDto extends PartialType(CreateAdoptContributionDto) {}
