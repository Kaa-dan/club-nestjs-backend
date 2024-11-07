export class CreateNodeDto {
  profileImage: Express.Multer.File;
  coverImage: Express.Multer.File;
  name: string;
  about: string;
  description: string;
  location: string;
}
