export interface Announcement {
  id: string;
  companyId: string;
  title: string;
  content: string;
  allowComments: boolean;
  createdBy: string;
  createdAt: string;
  updatedAt: string;

  authorName?: string;
  commentCount?: number;
}

export interface AnnouncementComment {
  id: string;
  announcementId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;

  userName?: string;
}
