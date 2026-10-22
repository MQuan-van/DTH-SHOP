import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../../../shop/useStore';
import { studioRequest, studioUrl, MODE } from '../../../shop/api';
import './ai-asset-studio.css';

const Preview3D = lazy(() => import('./AIModelPreview.jsx'));
const prefix = '/admin/ai-assets';
const terminal = new Set(['FAILED', 'CANCELED', 'SUCCEEDED', 'UNCERTAIN']);
const fmtSize = n => `${(n / 1024 / 1024).toFixed(2)} MB`;
const isActive = s => ['SUBMITTING', 'PENDING', 'IN_PROGRESS', 'QUEUED'].includes(s);
const fmtDate = date => { try { return new Date(date).toLocaleString('vi-VN'); } catch { return ''; } };

export default function AIAssetStudio() {
  const { user } = useStore();
  const [status, setStatus] = useState(null), [images, setImages] = useState([]), [jobs, setJobs] = useState([]);
  const [selected, setSelected] = useState([]), [target, setTarget] = useState('v3');
  const [previewId, setPreviewId] = useState('');
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false);
  const [error, setError] = useState(''), [notice, setNotice] = useState('');

  const load = useCallback(async (quiet = false) => {
    try {
      const [info, gallery, queue] = await Promise.all([
        studioRequest(`${prefix}/status`), studioRequest(`${prefix}/images`), studioRequest(`${prefix}/jobs`),
      ]);
      setStatus(info.data); setImages(gallery.data); setJobs(queue.data);
      setSelected(previous => previous.filter(id => gallery.data.some(image => image.id === id)));
      if (!quiet) setError('');
    } catch (e) { if (!quiet) setError(e.message); }
    finally { if (!quiet) setLoading(false); }
  }, []);
  useEffect(() => {
    if (MODE !== 'api' || user?.role !== 'admin') return undefined;
    let mounted = true;
    void load();
    const timer = setInterval(() => { if (mounted && !document.hidden) void load(true); }, 7000);
    return () => { mounted = false; clearInterval(timer); };
  }, [user?.role, load]);

  async function action(url, body, method = 'POST') {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const reply = await studioRequest(url, { method, body: JSON.stringify(body) });
      await load(true);
      return reply.data;
    } catch (e) { setError(e.message); return null; }
    finally { setBusy(false); }
  }
  function toggleImage(id) {
    setError('');
    setSelected(prev => prev.includes(id) ? prev.filter(item => item !== id) : prev.length < 4 ? [...prev, id] : prev);
  }
  async function generate() {
    if (!selected.length || busy) return;
    const named = selected.map(id => images.find(item => item.id === id)?.name).filter(Boolean);
    const message = `Gửi ${named.length} ảnh đến Meshy để tạo mô hình GLB?\n\n${named.join('\n')}\n\nTác vụ có thể tiêu Meshy credits. Ảnh phải là các góc của CÙNG một đối tượng. Không tự động thử lại nếu có lỗi kết nối.`;
    if (!window.confirm(message)) return;
    const job = await action(`${prefix}/jobs`, { imageIds: selected, confirmed: true });
    if (job) { setSelected([]); setNotice(`Đã đưa tác vụ vào hàng đợi (${job.id.slice(0, 8)}). Đang gửi ảnh đến Meshy…`); }
  }
  async function publish(job) {
    if (busy) return;
    if (!window.confirm(`Xuất bản mô hình từ task ${job.id.slice(0, 8)} cho Yamaha NVX ${target.toUpperCase()}?\n\nMẫu mới sẽ thay thế mẫu đã publish cho phiên bản này. Bạn có thể publish lại một task cũ để quay về mẫu trước.`)) return;
    const updated = await action(`${prefix}/jobs/${job.id}/publish`, { version: target, confirmed: true });
    if (updated) setNotice(`Đã publish NVX ${target.toUpperCase()}! Mở Shop → Build, chọn xe và tải lại trang để xem model mới.`);
  }
  async function check(job) {
    const updated = await action(`${prefix}/jobs/${job.id}/check`, {});
    if (updated) setNotice(`Đã cập nhật trạng thái task ${job.id.slice(0, 8)}.`);
  }
  if (MODE !== 'api' || user?.role !== 'admin') return <section className="dth-ai-assets"><h1>Administrator access required.</h1><p>Đăng nhập bằng tài khoản Admin và bật API mode để dùng Meshy.</p><Link to="/account">Back to account ↗</Link></section>;

  const running = jobs.some(job => isActive(job.status));
  return <section className="dth-ai-assets">
    <header className="dth-ai-header"><div><p>ADMIN / AI ASSET PIPELINE</p><h1>AI Asset Studio<span>.</span></h1><p>Drop photos into your local folder. Review and select up to four angles before generating a 3D model.</p></div><div className="dth-ai-header-actions"><Link to="/admin">← Admin</Link><button type="button" onClick={() => void load()} disabled={busy}>↻ Scan now</button></div></header>
    {error && <p className="dth-ai-feedback dth-ai-error" role="alert">{error}</p>}
    {notice && <p className="dth-ai-feedback" role="status">{notice}</p>}
    {loading ? <p role="status">Connecting to the asset service…</p> : <>
      <div className="dth-ai-stats">
        <div><small>MESHY CONNECTION</small><strong>{status?.keyConfigured ? 'Key configured ✓' : 'API key missing'}</strong><span>Key is stored server-side.</span></div>
        <div><small>LOCAL IMAGE LIBRARY</small><strong>{images.length} photos</strong><span>Updates about every 7 seconds</span></div>
        <div><small>GENERATION TASKS</small><strong>{jobs.length} tasks</strong><span>{running ? 'Task running · wait before new charge' : 'Ready for review'}</span></div>
      </div>
      <div className="dth-ai-main">
        <section className="dth-ai-panel dth-ai-library">
          <div className="dth-ai-panel-head"><div><p>01 / INPUTS</p><h2>Reference image library</h2></div><span>{selected.length} / 4 selected</span></div>
          <p className="dth-ai-help">Copy JPG, PNG or WEBP (up to 20 MB each) into the inbox directory. Choose several views of the <strong>same vehicle or part</strong>, with the front/primary image selected first.</p>
          <div className="dth-ai-directory" title={status?.inbox}>Inbox: <code>{status?.inbox || 'Unavailable'}</code></div>
          {images.length ? <div className="dth-ai-gallery">{images.map(image => {
            const index = selected.indexOf(image.id);
            return <button type="button" className="dth-ai-tile" data-selected={index !== -1} key={image.id}
              aria-pressed={index !== -1} onClick={() => toggleImage(image.id)} disabled={busy || (selected.length >= 4 && index === -1)}>
              <img src={studioUrl(`${prefix}/images/${image.id}/thumb`)} loading="lazy" alt={image.name} />
              <span className="dth-ai-selected-index">{index !== -1 ? String(index + 1).padStart(2, '0') : '+'}</span>
              <b title={image.name}>{image.name}</b><small>{fmtSize(image.size)}</small>
            </button>;
          })}</div> : <div className="dth-ai-blank"><strong>Waiting for your first photo.</strong><p>Copy images into the inbox folder shown above. The server will scan them automatically.</p></div>}
          <div className="dth-ai-actionbar"><div><b>{selected.length === 1 ? 'Single Image to 3D' : selected.length > 1 ? 'Multi-Image to 3D' : 'Select images to begin'}</b><small>Meshy 7.1 · standard geometry · 2K PBR texture · GLB</small></div><button type="button" className="dth-ai-primary" disabled={!status?.keyConfigured || !selected.length || busy || running} onClick={generate}>{busy ? 'Working…' : 'Generate 3D ↗'}</button></div>
          <p className="dth-ai-credit">Generation consumes Meshy API credits only after explicit confirmation. Auto-scan and preview do not generate paid tasks.</p>
        </section>
        <section className="dth-ai-panel dth-ai-queue">
          <div className="dth-ai-panel-head"><div><p>02 / RESULTS</p><h2>3D generation queue</h2></div><span>Saved across restarts</span></div>
          {jobs.length === 0 ? <div className="dth-ai-blank"><strong>No generation tasks yet.</strong><p>Select one or more reference images and click Generate 3D.</p></div> : <div className="dth-ai-jobs">{jobs.map(job => <article key={job.id} className="dth-ai-job">
            <div className="dth-ai-job-top"><strong>{job.providerType === 'multi-image-to-3d' ? 'Multi-view 3D' : 'Image to 3D'} <small>#{job.id.slice(0, 8)}</small></strong><span className="dth-ai-state" data-state={job.status}>{job.modelAvailable ? 'GLB ready' : job.status.replaceAll('_', ' ')}</span></div>
            <p>{job.images.map(i => i.name).join(' · ')}</p><div className="dth-ai-progress"><i style={{ width: `${job.progress || 0}%` }} /></div>
            <div className="dth-ai-job-meta"><span>{Math.round(job.progress || 0)}%</span><span>{job.consumedCredits != null ? `${job.consumedCredits} credits` : 'Credits: pending'}</span><span>{fmtDate(job.createdAt)}</span></div>
            {job.error && <p className="dth-ai-job-error" role="status">{job.error}</p>}
            <div className="dth-ai-job-actions">
              {job.providerTaskId && (!terminal.has(job.status) || job.status === 'SUCCEEDED' && !job.modelAvailable) && <button type="button" disabled={busy} onClick={() => check(job)}>Check now ↻</button>}
              {job.modelAvailable && <button type="button" onClick={() => setPreviewId(value => value === job.id ? '' : job.id)}>{previewId === job.id ? 'Hide preview' : 'Preview GLB 360°'}</button>}
            </div>
            {previewId === job.id && job.modelAvailable && <div className="dth-ai-preview"><Suspense fallback={<p>Loading 3D preview…</p>}><Preview3D jobId={job.id} /></Suspense></div>}
            {job.modelAvailable && <div className="dth-ai-publish"><label>Publish model to <select aria-label="Select NVX version" value={target} onChange={e => setTarget(e.target.value)}><option value="v1">NVX V1</option><option value="v2">NVX V2</option><option value="v3">NVX V3</option></select></label><button type="button" disabled={busy} onClick={() => publish(job)}>Publish to Build →</button></div>}
            {(job.publishedTo || []).length > 0 && <p className="dth-ai-published">Previously published for {job.publishedTo.map(v => v.toUpperCase()).join(', ')}.</p>}
          </article>)}</div>}
        </section>
      </div>
      <footer className="dth-ai-footer">03 / REVIEW BEFORE PUBLISH · AI-generated geometry may not reproduce mechanical dimensions or unseen surfaces faithfully. Do not use it for real vehicle fitment.</footer>
    </>}
  </section>;
}
