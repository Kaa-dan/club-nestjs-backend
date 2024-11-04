// src/club/dto/interest.dto.ts
export class CreateClubDto {
  readonly name: string;
  readonly about: string;
  readonly description: string;
  readonly profileImage: string;
  readonly coverImage: string;
  readonly isPublic: boolean;
}
