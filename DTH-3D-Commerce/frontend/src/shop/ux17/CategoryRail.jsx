import { categoryPatch, countLabel } from './commerce17.logic.mjs';

/** Uses the SAME multi-category URL state as the existing FilterPanel. */
export default function CategoryRail({ categories, selected, counts, onPatch }) {
  function choose(id) {
    const patch = categoryPatch(selected, id, categories);
    if (patch) onPatch(patch);
  }
  return <div className="ux17-categories" role="group" aria-label="Product categories">
    <button type="button" aria-pressed={!selected.length} onClick={() => choose('')}>All categories</button>
    {categories.map(item => <button key={item.id} type="button" aria-pressed={selected.includes(item.id)}
      onClick={() => choose(item.id)}>{item.label}<small>{countLabel(counts[item.id])}</small></button>)}
  </div>;
}
