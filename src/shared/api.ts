export type InitResponse = {
  type: 'init';
  postId: string;
  count: number;
  username: string;
  isModerator: boolean;
};

export type ModeratorInfo = {
  username: string;
  permissions: string[];
};

export type TrendPoint = {
  cases: number;
  resolved: number;
  label: string;
};

export type ModQueueItem = {
  id: string;
  authorName: string;
  authorReportCount?: number; // Lifetime reports for this user
  body: string;
  title?: string;
  createdAt: string;
  permalink: string;
  userReportReasons: string[];
  modReportReasons: string[];
  numReports: number;
  isLockedBy?: string; // Username of mod who locked it
  aiCategory?: string;
  aiScore?: number;
  aiEvidence?: string[];
};

export type CommentData = {
  id: string;
  authorName: string;
  body: string;
  createdAt: string;
  score: number;
  parentId?: string;
  replies?: CommentData[];
};

export type PostDetails = {
  id: string;
  title: string;
  body?: string;
  authorName: string;
  authorReportCount?: number;
  comments: CommentData[];
};

export type ModLogEntry = {
  id: string;
  type: string;
  moderatorName: string;
  createdAt: string;
  targetTitle?: string;
  targetAuthor?: string;
};

export type EscalatedCase = {
  id: string;
  itemId: string; // Reddit ID
  title: string;
  description: string;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assignee: string;
  status: 'Open' | 'Resolved' | 'Closed';
  createdAt: string;
  createdBy: string;
  subreddit: string;
  authorReportCount?: number;
  snapshot?: PostDetails; // Snapshotted content at time of escalation
  aiCategory?: string;
  aiScore?: number;
  aiEvidence?: string[];
};

export type FlairTemplateData = {
  id: string;
  type: 'post' | 'user';
  text: string;
  backgroundColor?: string;
  textColor?: 'dark' | 'light';
  modOnly?: boolean;
};

export type BannedUser = {
  id: string;
  username: string;
  date: string;
  reason: string;
  note: string;
  daysLeft?: number;
  itemId?: string; // context
};

export type LeaderboardEntry = {
  username: string;
  solvedCount: number;
  caseCount: number;
  total: number;
};

export type BrigadeAlert = {
  id: string;
  itemId: string;
  type: 'Rapid Participation' | 'New User Spike' | 'Report Burst' | 'Hostile Burst';
  reason: string;
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  createdAt: string;
  threadTitle?: string;
  permalink?: string;
  status: 'Live' | 'Solved';
  resolvedAt?: string;
  resolvedBy?: string;
  isLocked?: boolean;
  crowdControlLevel?: 'OFF' | 'LENIENT' | 'MEDIUM' | 'STRICT';
  postBrigadeCount: number;
};

export type BrigadeSettings = {
  rapidInterval: number; // seconds
  rapidThreshold: number; // number of comments
  newUserThreshold: number; // % of new users
  accountAgeDays: number; // min age for 'new user'
  karmaThreshold: number; // min karma
  enabled: boolean;
  sendModMail: boolean;
};

export type AutoModRule = {
  id: string;
  title: string;
  flairId?: string;
  flairText?: string;
  blacklist: string[];
  tolerationLimit: number;
  createdAt: string;
  createdBy: string;
};

export type DashboardData = {
  moderatorCount: number;
  modQueueCount: number;
  resolvedCount: number;
  moderators: ModeratorInfo[];
  trend: TrendPoint[];
  modQueue: ModQueueItem[];
  modLog: ModLogEntry[];
  cases: EscalatedCase[];
  reportStats: Record<string, number>;
  leaderboard: LeaderboardEntry[];
  postFlairs: FlairTemplateData[];
  userFlairs: FlairTemplateData[];
  flairStats: Record<string, number>;
  bannedUsers: BannedUser[];
  brigadeAlerts: BrigadeAlert[];
  brigadeSettings: BrigadeSettings;
  autoModRules: AutoModRule[];
  totalSolvedCount: number;
};


export type IncrementResponse = {
  type: 'increment';
  postId: string;
  count: number;
};

export type DecrementResponse = {
  type: 'decrement';
  postId: string;
  count: number;
};
