import { Link } from 'react-router-dom';
import { useStore } from '../../../useStore.jsx';
import ProductCard from '../../../components/ProductCard.jsx';
import Icon from '../../../components/StoreIcon.jsx';
import SectionShell from '../../components/SectionShell.jsx';
import styles from './FeaturedSection.module.css';
export default function FeaturedSection({ config, motion, motionEnabled }) {
  const { data } = useStore();
  const featured = data.products.filter(p => p.featured).slice(0, config.count);
  return <SectionShell id="featured" className={`dth-container ${styles.section}`} motion={motion} motionEnabled={motionEnabled} aria-labelledby="featured-title">
    <div className="home-heading"><div><p className="home-eyebrow">{config.eyebrow}</p><h2 id="featured-title" className="home-title">{config.title}</h2></div><Link className="home-link" to="/shop">View all parts<Icon name="arrow" /></Link></div>
    {featured.length ? <div className="dth-product-grid">{featured.map(product => <ProductCard key={product.id} product={product} />)}</div> : <p className="dth-muted">No featured products selected yet. Explore the full collection.</p>}
  </SectionShell>;
}
