import { useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../../shop/useStore';
import { MODE } from '../../shop/api';
import AccountPage from '../../shop/account/AccountPage';
import HomePage from '../../shop/home/HomePage';
import useIntroCover from './useIntroCover';
import { entranceDecision, storyVisited } from './journey.logic.mjs';

/** Only the / entrance changes. Product, checkout, account and admin URLs remain intact. */
export default function StudioEntry() {
  const store = useStore(), navigate = useNavigate(), covered = useIntroCover();
  const decision = entranceDecision({ loading: store.authLoading, error: store.authError,
    user: store.user, mode: MODE, visited: true /* Step18.1: Story is optional; new sign-in goes to Shop. */ });
  useEffect(() => {
    if (!covered && decision === 'story') navigate('/story?intro=1', { replace: true });
  }, [covered, decision, navigate]);
  if (decision === 'account') return <AccountPage />;
  if (decision === 'home') return <HomePage />;
  if (decision === 'pending') return <div className="dth-empty" role="status">Preparing your studio…</div>;
  // Real route text satisfies existing readiness. Never redirect while the intro covers the app.
  return <section className="dth-empty" aria-label="Opening Story">
    <h1>Enter the DTH perspective.</h1><p role="status">Opening your story…</p>
    <Link to="/story?intro=1">Continue to Story →</Link>
  </section>;
}
