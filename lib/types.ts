export interface ScrapeRequest {
  query: string;
  sort: "relevance" | "hot" | "top" | "new" | "comments";
  time_filter: "hour" | "day" | "week" | "month" | "year" | "all";
  limit: number;
  deep_search: boolean;
  report: boolean;
  min_score: number;
  max_threads: number;
  instructions: string;
  model: string;
}

export interface Post {
  title: string;
  subreddit: string;
  score: string;
  comments: string;
  url: string;
  found_by?: string;
}

export type StageId = "scraping" | "agent" | "report" | "done";

export interface Stage {
  id: StageId;
  label: string;
  status: "idle" | "active" | "done";
  detail?: string;
}

export interface StreamState {
  jobId: string | null;
  status: "idle" | "running" | "done" | "error";
  stages: Stage[];
  variants: string[];
  posts: Post[];
  report: string;
  threadsTotal: number;
  threadsFetched: number;
  error: string | null;
  progressMsg: string;
}
