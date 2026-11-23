// サイトと収集スクリプトで共有する型

export const ROLES = ["programmer", "planner", "effect", "artist", "other"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABEL: Record<Role, string> = {
  programmer: "プログラマー",
  planner: "プランナー",
  effect: "エフェクトデザイナー",
  artist: "アーティスト",
  other: "その他",
};

export type OpeningType = "internship" | "newgrad" | "event" | "other";
export const TYPE_LABEL: Record<OpeningType, string> = {
  internship: "インターン",
  newgrad: "新卒採用",
  event: "説明会・イベント",
  other: "その他",
};

export type WorkFormat = "online" | "onsite" | "hybrid" | "unknown";
export const FORMAT_LABEL: Record<WorkFormat, string> = {
  online: "オンライン",
  onsite: "対面",
  hybrid: "対面＋オンライン",
  unknown: "形式不明",
};

export interface Opening {
  /** 会社 ID と題名から作る安定した ID（お気に入りのキー） */
  id: string;
  companyId: string;
  title: string;
  type: OpeningType;
  roles: Role[];
  /** 対象の卒業年（例: 2028）。空なら不明 */
  graduationYears: number[];
  /** YYYY-MM-DD。空文字は不明 */
  applyStart: string;
  deadline: string;
  /** 開催・選考の期間などの自由記述 */
  period: string;
  format: WorkFormat;
  location: string;
  summary: string;
  sourceUrl: string;
  /** この募集を初めて見つけた日（YYYY-MM-DD） */
  firstSeen: string;
}

/** 会社ごとの飛び先（新卒採用・インターン・企業理念） */
export interface CompanyLinks {
  newgrad?: string;
  internship?: string;
  /** 給与（初任給・待遇）が書かれている所まで飛ぶ URL */
  salary?: string;
  /** 企業理念が書かれている所まで飛ぶ URL（#:~:text= で見出しへ飛ぶ） */
  philosophy?: string;
}

export interface CompanyEntry {
  id: string;
  name: string;
  tags: string[];
  url: string;
  enabled: boolean;
  note?: string;
  links?: CompanyLinks;
  /** public/assets/ からの道（例: logos/sega.png） */
  logo?: string;
  /** 本社・スタジオのある都道府県（「東京」「北海道」など） */
  locations?: string[];
  /** 公式サイトのトップ（採用ページが無い会社の入口にも使う） */
  site?: string;
}

export interface CompanyResult {
  id: string;
  name: string;
  tags: string[];
  url: string;
  enabled: boolean;
  note?: string;
  links?: CompanyLinks;
  logo?: string;
  locations?: string[];
  site?: string;
  /** 最後に見に行った日時（ISO） */
  lastChecked: string | null;
  /** ページの中身が最後に変わった日時（ISO） */
  lastChanged: string | null;
  /** 最後の収集で起きた問題。無ければ null */
  error: string | null;
  /** AI がまとめた、会社の採用の要点（1〜2 文） */
  digest: string;
  openings: Opening[];
}

export interface JobsData {
  updatedAt: string | null;
  /** 載せている募集の対象の卒業年（例: 2028） */
  targetGraduationYear?: number;
  model: string | null;
  companies: CompanyResult[];
}
