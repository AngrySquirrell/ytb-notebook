export interface CaptionChunk {
  text: string;
  start: number; // in seconds
  duration: number; // in seconds
}

export interface YoutubeVideoMetadata {
  title: string;
  description: string;
  thumbnail: string;
  duration: string;
  viewCount: string;
  video_id: string;
  publishDate: string;
  channelName: string;
  channelUrl: string;
  channelAvatar: string;
  subscriberCount: string;
  isVerified: boolean;
  likesAmount: string;
  transcript?: YoutubeCaptions["metadata"];
}

export interface YoutubeAvailableCaptions {
  video_id: string;
  available_languages: {
    language: string;
    language_code: string;
    is_generated: boolean;
    is_translatable: boolean;
  }[];
}
export interface YoutubeCaptions {
  metadata: {
    video_id: string;
    language: string;
    language_code: string;
    is_generated: boolean;
  };
  captions: string;
  chunks: CaptionChunk[];
}

export type CaptionItems = CaptionChunk[];
