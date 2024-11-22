import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class AdoptDebateDto {
  @IsEnum(['club', 'node'], { message: 'Type must be either "club" or "node"' })
  @IsNotEmpty()
  type: 'club' | 'node';

  @IsString()
  @IsNotEmpty()
  debateId: string;

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  @IsString()
  nodeId?: string;
}
