import SectionShell from '../../components/SectionShell.jsx';
import styles from './WorkflowSection.module.css';
export default function WorkflowSection({ config, motion, motionEnabled }) {
  return <SectionShell id="how-it-works" className={styles.section} motion={motion} motionEnabled={motionEnabled} aria-label="Shopping workflow">
    <div className={`dth-container ${styles.grid}`}>{config.steps.map((step, index) => <div key={step.title} className={styles.step}><span>{String(index + 1).padStart(2, '0')}</span><div><h2>{step.title}</h2><p>{step.detail}</p></div>{index < config.steps.length - 1 && <i aria-hidden="true">↗</i>}</div>)}</div>
  </SectionShell>;
}
