import { IsString } from "class-validator";

export class CreateFolderDto {
    @IsString()
    title: string

    @IsString()
    user: string;
}

export class BookmarkPostDto {
    @IsString()
    entityId: string

    @IsString()
    entityType: string

    @IsString()
    folderId: string
}