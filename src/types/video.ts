export interface CaptionItem {
  text: string;
  start: number;
  duration: number;
}

export interface YoutubeVideoMetadata {
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  viewCount: string;
  videoId: string;
  publishDate: string;
  channelName: string;
  channelUrl: string;
  channelAvatar: string;
  subscriberCount: string;
  isVerified: boolean;
  likesAmount: string;
}

export type CaptionItems = CaptionItem[];
