import type { Data } from '../data';
import { FormulaViewer } from '../components/FormulaViewer';

export function Formulas({ data, params }: { data: Data; params: URLSearchParams }) {
  const p = Number(params.get('p'));
  const start = p ? data.formulas.pages.findIndex((x) => x.page === p) : undefined;
  return (
    <div class="page full">
      <FormulaViewer f={data.formulas} start={start !== undefined && start >= 0 ? start : undefined} />
    </div>
  );
}
