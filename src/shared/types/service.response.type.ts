export type ServiceResponse<T = {} | [] | any> = Promise<{
    success: boolean;
    data?: T;
    token?:string
    status: number;
    message: string;
}>;