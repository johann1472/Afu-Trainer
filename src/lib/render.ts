import katex from 'katex';
import { katexMacros } from './katex-macros';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Katalogtext (inline-LaTeX in $…$, \n als Umbruch) → HTML. */
export function renderText(text: string, throwOnError = false): string {
  const parts = text.split('$');
  if (parts.length % 2 === 0) throw new Error(`Ungerade Anzahl $ in: ${text}`);
  return parts
    .map((p, i) =>
      i % 2
        ? katex.renderToString(p, { throwOnError, macros: { ...katexMacros }, output: 'html' })
        : esc(p).replace(/\n/g, '<br>'),
    )
    .join('');
}
