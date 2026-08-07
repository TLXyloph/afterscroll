export type Category = 'coding' | 'fitness' | 'career' | 'finance' | 'life' | 'other';

export type RawBookmark = {
  tweetId: string;
  author: string;
  text: string;
  url: string;
  mediaType: 'text' | 'video' | 'image';
};

export type Todo = {
  id: string;
  tweetId: string;
  title: string;
  category: Category;
  done: boolean;
  createdAt: string;
};

export type EventSuggestion = {
  id: string;
  tweetId: string;
  title: string;
  startTs: string | null;
  durationMin: number;
  added: boolean;
};

export type Insight = {
  id: string;
  tweetId: string;
  text: string;
  category: Category;
  sourceUrl: string;
  createdAt: string;
};
