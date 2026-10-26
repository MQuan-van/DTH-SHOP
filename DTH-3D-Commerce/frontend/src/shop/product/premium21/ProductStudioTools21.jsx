import { useId } from 'react';
import { DEFAULT_STUDIO21, STUDIO_PRESETS21, normalizeStudio21, formatAssetStats21 } from './studio21.mjs';
import './studio21.css';

export default function ProductStudioTools21({ value, onChange, ready, blocked, eco, report }) {
  const id = useId();
  const settings = normalizeStudio21(value);
  const disabled = !ready || blocked;
  const stats = formatAssetStats21(report);
  const update = patch => onChange(normalizeStudio21({ ...settings, ...patch }));
  return <section className="dth-studio21" aria-label="Product studio lighting">
    <div className="dth-studio21-heading"><span>STUDIO LIGHTING</span><small>Original model · presentation controls only</small></div>
    <div className="dth-studio21-presets" role="group" aria-label="Lighting presets">
      {Object.entries(STUDIO_PRESETS21).map(([key, preset]) => <button type="button" key={key}
        disabled={disabled} aria-pressed={settings.preset === key}
        onClick={() => update({ preset: key, exposure: 1 })}>{preset.label}</button>)}
    </div>
    <div className="dth-studio21-fields">
      <label htmlFor={`${id}-exposure`}>Exposure <output>{settings.exposure.toFixed(2)}×</output>
        <input id={`${id}-exposure`} type="range" min="0.7" max="1.4" step="0.05"
          value={settings.exposure} disabled={disabled} onChange={e => update({ exposure: Number(e.target.value) })} />
      </label>
      <label htmlFor={`${id}-quality`}>Display quality
        <select id={`${id}-quality`} value={eco ? 'balanced' : settings.quality} disabled={disabled || eco}
          onChange={e => update({ quality: e.target.value })}>
          <option value="balanced">Balanced</option><option value="sharp">Sharper</option>
        </select>
      </label>
      <button type="button" className="dth-studio21-reset" disabled={disabled}
        onClick={() => onChange({ ...DEFAULT_STUDIO21 })}>Reset lighting</button>
    </div>
    <p className="dth-studio21-note">{eco
      ? 'Display resolution is capped in compact or data-saving mode. The source mesh is unchanged.'
      : 'Sharper increases render resolution, not the detail stored in the GLB. Use Balanced if interaction slows down.'}</p>
    {stats && <p className="dth-studio21-stats">{stats}<span>Source geometry preserved</span></p>}
  </section>;
}
