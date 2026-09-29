export type NavigationTab = 'services' | 'passport' | 'fresh-reissue';

export type FreshReissueSection = 'form' | 'preview' | 'submitted';

export interface UserProfile {
  email: string;
  name: string;
  picture: string;
  id_token: string;
  access_token: string;
  expires_at: number;
}
