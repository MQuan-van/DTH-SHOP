import { useLayoutEffect, useState } from 'react';
import { useStore } from '../useStore.jsx';
import { useOutletContext } from 'react-router-dom';
import { HOME_CONFIG, enabledSections } from './home.config.mjs';
import { useReducedMotion } from './hooks/useStudioMotion.js';
import HeroSection from './sections/Hero/HeroSection.jsx';
import WorkflowSection from './sections/Workflow/WorkflowSection.jsx';
import CategoriesSection from './sections/Categories/CategoriesSection.jsx';
import FeaturedSection from './sections/Featured/FeaturedSection.jsx';
import FitmentSection from './sections/Fitment/FitmentSection.jsx';
import './home.tokens.css';

const SECTION_COMPONENTS = { hero: HeroSection, workflow: WorkflowSection, categories: CategoriesSection, featured: FeaturedSection, fitment: FitmentSection };
export default function HomePage() {
  const { data } = useStore();
  const { chooseVehicle } = useOutletContext();
  const reduced = useReducedMotion();
  const [motionRequested, setMotionRequested] = useState(HOME_CONFIG.motion.enabled);
  const motionEnabled = motionRequested && !reduced;
  useLayoutEffect(() => {
    document.documentElement.dataset.dthHome = 'true';
    return () => { delete document.documentElement.dataset.dthHome; };
  }, []);
  if (!data.products.length) return <div className="dth-empty">The catalog is empty. Run the catalog seed command.</div>;
  return <div className="home-studio" data-motion={motionEnabled ? 'on' : 'off'}>
    {enabledSections().map(id => {
      const Section = SECTION_COMPONENTS[id];
      return Section ? <Section key={id} config={HOME_CONFIG[id]} motion={HOME_CONFIG.motion}
        motionEnabled={motionEnabled} reduced={reduced} chooseVehicle={chooseVehicle}
        onToggleMotion={() => setMotionRequested(value => !value)} /> : null;
    })}
  </div>;
}
