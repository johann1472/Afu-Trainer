export function Bar({ solid, seen, total }: { solid: number; seen: number; total: number }) {
  const pct = (n: number) => (total ? (100 * n) / total : 0);
  return (
    <div class="bar" title={`${solid} gefestigt, ${seen} gesehen von ${total}`}>
      <div class="bar-seen" style={{ width: `${pct(seen)}%` }} />
      <div class="bar-solid" style={{ width: `${pct(solid)}%` }} />
    </div>
  );
}
