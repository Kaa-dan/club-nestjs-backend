import { IsNotEmpty, IsString, IsEnum, IsMongoId } from 'class-validator';

export class CreateDebateArgumentDto {
  @IsMongoId()
  @IsNotEmpty()
  debate: string;

  @IsMongoId()
  @IsNotEmpty()
  participantUser: string;

  @IsEnum(['support', 'against'])
  @IsNotEmpty()
  participantSide: 'support' | 'against';

  @IsString()
  @IsNotEmpty()
  content: string;
}
