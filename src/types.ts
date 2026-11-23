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

/** 選考の段階の種類（アイコンと色を決める） */
export const FLOW_KINDS = [
  "entry", "briefing", "es", "portfolio", "assignment", "test", "groupwork", "interview", "final", "offer", "other",
] as const;
export type FlowKind = (typeof FLOW_KINDS)[number];
export const FLOW_LABEL: Record<FlowKind, string> = {
  entry: "エントリー",
  briefing: "説明会",
  es: "ES・書類",
  portfolio: "作品提出",
  assignment: "課題",
  test: "適性検査",
  groupwork: "グループワーク",
  interview: "面接",
  final: "最終面接",
  offer: "内定",
  other: "その他",
};

/** 選考の 1 段階。roles があればその職種だけの段階 */
export interface FlowStep {
  kind: FlowKind;
  /** ページの表記（「技術課題」「一次面接」など） */
  label: string;
  roles?: Role[];
}

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
  /** 選考の流れ（ページに書かれている時だけ） */
  flow?: FlowStep[];
  /** 選考の流れが書かれていたページ（出典）。無ければ sourceUrl */
  flowSourceUrl?: string;
  /** 流れについての注意（例:「27卒の選考フロー」）。対象の卒業年の物と言い切れない時に付ける */
  flowNote?: string;
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
  /** 前の年（例: 27卒）の募集がいつ始まったか。ページに書かれている時だけ */
  previous?: PreviousCycle;
  /** 待遇（ページに数字で書かれている物だけ） */
  conditions?: Conditions;
  openings: Opening[];
}

/** 新卒の待遇。書かれていない項目は入れない */
export interface Conditions {
  /** 初任給（月給・円）。学歴で違うときは学部卒（無ければいちばん低い額） */
  salary?: number;
  /** 初任給の表記（例:「学部卒 月給26万円（固定残業代含む）」） */
  salaryLabel?: string;
  /** 年間休日（日） */
  holidays?: number;
  /** 月の平均残業時間（時間） */
  overtime?: number;
  /** 数字が書かれていたページ */
  sourceUrl: string;
}

export interface PreviousCycle {
  /** 例:「27卒の本選考は2026年3月にエントリー開始」 */
  text: string;
  sourceUrl: string;
}

export interface JobsData {
  updatedAt: string | null;
  /** 載せている募集の対象の卒業年（例: 2028） */
  targetGraduationYear?: number;
  model: string | null;
  companies: CompanyResult[];
}

/** 会社が作った・関わったゲーム（public/data/games.json） */
export interface GameItem {
  title: string;
  year?: number;
  /** dev: 開発 / pub: 発売・運営 / both: 両方 */
  role: "dev" | "pub" | "both";
  /** Wikipedia・App Store・Steam のページ */
  url?: string;
  icon?: string;
  /** square: アプリのアイコン / wide: Steam の横長の画像 */
  iconShape?: "square" | "wide";
  /** よく知られている度合い（並べ替え用） */
  score?: number;
}

export interface CompanyGames {
  wikidata?: string;
  games: GameItem[];
  checked: string;
}

export interface GamesData {
  updatedAt: string | null;
  companies: Record<string, CompanyGames>;
}

/** 採用ページに書かれている言語・エンジン（public/data/tech.json） */
export type TechKind = "engine" | "lang" | "gfx";

export interface TechItem {
  name: string;
  kind: TechKind;
  /** その名前が書かれていたページ */
  sourceUrl: string;
}

export interface TechData {
  updatedAt: string;
  companies: Record<string, TechItem[]>;
}
