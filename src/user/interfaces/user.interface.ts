enum SignupThrough {
  GMAIL = 'gmail',
  EMAIL = 'email',
  FACEBOOK = 'facebook',
  APPLE = 'apple',
}
enum OnBoardingStage {
  BASIC = 'basic',
  IMAGE = 'image',
  INTERESTS = 'interests',
  COMPLETED = 'completed',
}

enum Gender {
  MALE = 'male',
  FEMALE = 'female',
  OTHER = 'other',
}
export interface IUser {
  _id: string;
  email: string;
  interests: string[];
  isBlocked: boolean;
  emailVerified: boolean;
  registered: boolean;
  signupThrough: SignupThrough;
  isOnBoarded: boolean;
  onBoardingStage: OnBoardingStage;
  firstName: string;
  lastName: string;
  gender: Gender;
  phoneNumber: string;
  coverImage?: string;
  profileImage?: string;
  __v: number;
}
