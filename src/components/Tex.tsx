import { useMemo } from 'preact/hooks';
import { renderText } from '../lib/render';

export function Tex({ text, class: cls }: { text: string; class?: string }) {
  const html = useMemo(() => {
    try {
      return renderText(text);
    } catch {
      return text;
    }
  }, [text]);
  return <span class={cls} dangerouslySetInnerHTML={{ __html: html }} />;
}
