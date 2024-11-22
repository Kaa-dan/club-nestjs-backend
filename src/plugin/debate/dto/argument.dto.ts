import { IsNotEmpty, IsString, IsEnum, IsMongoId } from 'class-validator';

export class CreateDebateArgumentDto {
  @IsMongoId()
  @IsNotEmpty()
  debate: string; // ID of the debate

  @IsMongoId()
  @IsNotEmpty()
  participantUser: string; // ID of the user posting the argument

  @IsEnum(['support', 'against'])
  @IsNotEmpty()
  participantSide: 'support' | 'against'; // Side chosen by the participant

  @IsString()
  @IsNotEmpty()
  content: string; // Argument content
}
