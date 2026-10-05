import styles from './AssetProfileDetails.module.css';
const sourceLabels={demo:'Illustrative demo',photogrammetry:'Photogrammetry', 'ai-generated':'AI-generated from reference material',manual:'Manually authored',unknown:'Not recorded'};
export default function AssetProfileDetails({report,request,failed,image}) {
  const status=failed?'unavailable':report?.status??(image?'image':request.status==='pending'?'pending':request.status);
  const active=status==='profile';
  const heading=active?`Profile ${report.version}`:status==='pending'?'Checking asset':status==='unavailable'?'Image fallback':status==='image'?'Image preview':status==='automatic'?'Automatic framing':'Profile not applied';
  return <details className={styles.details} data-asset-profile={status}>
    <summary><span>3D asset</span><strong>{heading}</strong><span className={styles.chevron} aria-hidden="true">⌄</span></summary>
    <div className={styles.body}>
      {active?<><p>Presentation settings are bound to this GLB version. This does not verify dimensions or vehicle fit.</p>
        <dl><div><dt>Source</dt><dd>{sourceLabels[report.provenance.source]||'Not recorded'}</dd></div>
          <div><dt>Tool</dt><dd>{report.provenance.tool||'Not recorded'}</dd></div>
          <div><dt>License record</dt><dd>{report.provenance.license}</dd></div>
          {report.provenance.captureDate&&<div><dt>Capture date</dt><dd>{report.provenance.captureDate}</dd></div>}
          <div><dt>Optimization</dt><dd>{report.provenance.optimized===true?'Recorded as optimized':report.provenance.optimized===false?'Not optimized':'Not recorded'}</dd></div>
        </dl>{report.provenance.attribution&&<p>{report.provenance.attribution}</p>}</>
        :<p>{failed?'3D could not be prepared. The product image and purchase controls remain available.':report?.reason||request.reason||'Presentation settings are applied after the model is checked.'}</p>}
      {report&&<dl><div><dt>GLB size</dt><dd>{(report.byteLength/1024/1024).toFixed(2)} MiB</dd></div>
        <div><dt>Triangles</dt><dd>{report.triangles.toLocaleString('en-US')}</dd></div>
        <div><dt>Embedded images</dt><dd>{report.textureDimensions.length?report.textureDimensions.map(([w,h])=>`${w} × ${h}`).join(', '):'None'}</dd></div></dl>}
      <p className={styles.note}>3D is for visual exploration. Vehicle compatibility comes from the catalog mapping, not this geometry.</p>
    </div>
  </details>;
}
