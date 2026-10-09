import styles from './LoginCinematic.module.css';

export default function LoginAtmosphere({ phase = 'idle' }) {
  return <div className={styles.atmosphere} data-phase={phase} aria-hidden="true">
    <span className={styles.depth}/>
    <span className={styles.orbit}/>
    <span className={styles.orbit}/>
    <span className={styles.cross}><i/><i/></span>
    <span className={styles.scan}/>
    <span className={styles.code}>ACCESS / 01</span>
    <span className={styles.coordinate}>10.8231° N · 106.6297° E</span>
  </div>;
}
