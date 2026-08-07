export type Tint =
  | "primary"
  | "amber"
  | "blue"
  | "rose"
  | "red"
  | "success";

export type IconKey =
  | "cap"
  | "trophy"
  | "pin"
  | "folder"
  | "rocket"
  | "package"
  | "book";

export type ActionTone = "success" | "blue" | "amber" | "neutral";

export type MemoryCategory =
  | "opportunities"
  | "learn"
  | "places"
  | "products";

export interface Memory {
  id: string;
  icon: IconKey;
  tint: Tint;
  media: {
    image: string;
    type: "post" | "video";
    source: string;
    duration?: string;
  };
  title: string;
  description: string;
  meta: string;
  category: MemoryCategory;
  categoryLabel: string;
  action: { label: string; tone: ActionTone };
  amount?: string;
}

export interface MemoryTab {
  key: "all" | MemoryCategory;
  label: string;
  count: number;
}

export const memoryTabs: MemoryTab[] = [
  { key: "all", label: "All", count: 187 },
  { key: "opportunities", label: "Opportunities", count: 23 },
  { key: "learn", label: "Learn", count: 76 },
  { key: "places", label: "Places", count: 41 },
  { key: "products", label: "Products", count: 19 },
];

export const memories: Memory[] = [
  {
    id: "ai-fellowship",
    icon: "cap",
    tint: "red",
    media: {
      image:
        "https://images.unsplash.com/photo-1521737711867-e3b97375f902?auto=format&fit=crop&w=720&q=85",
      type: "post",
      source: "@aifellowship",
    },
    title: "AI Fellowship",
    description: "Fellowship with $10K stipend for AI researchers and builders.",
    meta: "Deadline: Aug 20, 2024",
    category: "opportunities",
    categoryLabel: "Opportunity",
    action: { label: "APPLY", tone: "success" },
    amount: "$10K",
  },
  {
    id: "cerebral-valley",
    icon: "trophy",
    tint: "amber",
    media: {
      image:
        "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=720&q=85",
      type: "video",
      source: "@cerebralvalley",
      duration: "0:38",
    },
    title: "Cerebral Valley Hackathon",
    description: "Build the future of AI. Prizes up to $5K.",
    meta: "Deadline: Aug 25, 2024",
    category: "opportunities",
    categoryLabel: "Opportunity",
    action: { label: "APPLY", tone: "success" },
    amount: "$5K",
  },
  {
    id: "best-burger",
    icon: "pin",
    tint: "success",
    media: {
      image:
        "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=720&q=85",
      type: "post",
      source: "@eatsf",
    },
    title: "Best Burger in San Francisco",
    description: "This place blew my mind. Must try!",
    meta: "Saved on Jul 19",
    category: "places",
    categoryLabel: "Place",
    action: { label: "MAP", tone: "blue" },
  },
  {
    id: "ml-projects",
    icon: "folder",
    tint: "primary",
    media: {
      image:
        "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=720&q=85",
      type: "video",
      source: "@mlnotes",
      duration: "1:12",
    },
    title: "10 ML Projects to Build in 2024",
    description: "A thread full of practical project ideas.",
    meta: "Saved on Jul 17",
    category: "learn",
    categoryLabel: "Learn",
    action: { label: "VIEW", tone: "neutral" },
  },
  {
    id: "founders-inc",
    icon: "rocket",
    tint: "primary",
    media: {
      image:
        "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=720&q=85",
      type: "post",
      source: "@foundersinc",
    },
    title: "Founders Inc Accelerator",
    description: "Backing early founders. Applications now open.",
    meta: "Deadline: Aug 31, 2024",
    category: "opportunities",
    categoryLabel: "Opportunity",
    action: { label: "APPLY", tone: "success" },
  },
  {
    id: "attention-thread",
    icon: "book",
    tint: "amber",
    media: {
      image:
        "https://images.unsplash.com/photo-1555949963-aa79dcee981c?auto=format&fit=crop&w=720&q=85",
      type: "video",
      source: "@attentionlab",
      duration: "2:04",
    },
    title: "Transformer math cheat sheet",
    description: "Everything about attention in one clean thread.",
    meta: "Saved on Jul 12",
    category: "learn",
    categoryLabel: "Learn",
    action: { label: "VIEW", tone: "neutral" },
  },
  {
    id: "blue-bottle",
    icon: "pin",
    tint: "blue",
    media: {
      image:
        "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=720&q=85",
      type: "post",
      source: "@bluebottle",
    },
    title: "Blue Bottle, Hayes Valley",
    description: "Best pour-over in the city, hands down.",
    meta: "Saved on Jul 10",
    category: "places",
    categoryLabel: "Place",
    action: { label: "MAP", tone: "blue" },
  },
  {
    id: "notion-ai",
    icon: "package",
    tint: "rose",
    media: {
      image:
        "https://images.unsplash.com/photo-1553877522-43269d4ea984?auto=format&fit=crop&w=720&q=85",
      type: "post",
      source: "@notionhq",
    },
    title: "Notion AI for teams",
    description: "Great writeup on automating team workflows.",
    meta: "Saved on Jul 22",
    category: "products",
    categoryLabel: "Product",
    action: { label: "VIEW", tone: "neutral" },
  },
];

export const askData = {
  question: "What AI opportunities did I save this month?",
  fullHistoryTokens: 82419,
  memoriesFound: 6,
  retrievedTokens: 684,
  answers: [
    {
      id: "cerebral-valley",
      title: "Cerebral Valley Hackathon",
      meta: "Aug 25",
    },
    { id: "ai-fellowship", title: "AI Fellowship", meta: "Aug 20" },
    {
      id: "founders-inc",
      title: "Founders Inc Accelerator",
      meta: "Aug 31",
    },
  ],
  deadlinesWithin14Days: 2,
};

export const economics = {
  timeRanges: ["7D", "30D", "90D", "All Time"],
  activeRange: "30D",
  rawContentTokens: 82419,
  memoryTokens: 14682,
  compressionPct: 82.2,
  queriesAsked: 18,
  thisQuery: {
    naiveTokens: 82419,
    retrievedTokens: 684,
    tokensAvoided: 81735,
    avoidedPct: 99.17,
    costSaved: 0.27,
  },
  actionsGenerated: 27,
  deadlinesDetected: 12,
  deadlinesActedOn: 9,
};

export const importState = {
  account: "X (Twitter)",
  bookmarksFound: 437,
  bookmarksTotal: 437,
  rawTokens: 82419,
};

export const impactStats = [
  { value: "97%", label: "Context Reduction" },
  { value: "$0.27", label: "Saved per query" },
  { value: "32x", label: "More efficient" },
  { value: "∞", label: "Scalable Memory" },
];
