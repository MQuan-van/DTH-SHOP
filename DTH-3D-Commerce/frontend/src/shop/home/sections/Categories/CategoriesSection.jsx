import { Link } from 'react-router-dom';
import { CATEGORIES } from '../../../../../../shared/domain.mjs';
import { CATEGORY_LABELS } from '../../home.config.mjs';
import { useStore } from '../../../useStore.jsx';
import SectionShell from '../../components/SectionShell.jsx';
import styles from './CategoriesSection.module.css';
export default function CategoriesSection({ config, motion, motionEnabled }) {
  const { data } = useStore();
  return <SectionShell id="categories" className={`dth-container ${styles.section}`} motion={motion} motionEnabled={motionEnabled} aria-labelledby="category-title">
    <div className="home-heading"><div><p className="home-eyebrow">{config.eyebrow}</p><h2 id="category-title" className="home-title">{config.title}</h2></div><span className={styles.total}>{CATEGORIES.length} CATEGORIES / {data.products.length} DEMO PARTS</span></div>
    <div className={styles.grid}>{CATEGORIES.map((category, index) => <Link key={category} to={`/shop?category=${category}`} className={styles.card}><span className={styles.index}>{String(index + 1).padStart(2, '0')}</span><span className={styles.name}>{CATEGORY_LABELS[category]}</span><span className={styles.count}>{data.products.filter(p => p.category === category).length} parts</span><span className={styles.arrow} aria-hidden="true">↗</span></Link>)}</div>
  </SectionShell>;
}
