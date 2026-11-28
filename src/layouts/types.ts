import type { CompanyResult, Opening, Role } from "../types.ts";

/** 新しい 4 つの表示（すっきりカード・会社ごと・日付順・一覧＋詳細）が受け取る物は共通 */
export interface LayoutProps {
  /** 絞り込み・並び替え済み */
  shown: Opening[];
  companies: Map<string, CompanyResult>;
  role: Role | "all";
  lastRun?: string;
  showClosed: boolean;
}
