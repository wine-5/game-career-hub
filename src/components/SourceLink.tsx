import { Icon } from "./Icon.tsx";

/** 情報を読み取ったページへのリンク。載せている内容の根拠として必ず添える */
export function SourceLink({ url, label = "出典" }: { url: string; label?: string }) {
  let host = url;
  try {
    host = new URL(url).hostname.replace(/^www\./, "");
  } catch {
    /* URL でなければそのまま出す */
  }
  return (
    <a className="source-link" href={url} target="_blank" rel="noopener noreferrer" title={`${label}: ${url}`}>
      <Icon name="doc" size={11} />
      {label}: {host}
      <Icon name="external" size={10} />
    </a>
  );
}
