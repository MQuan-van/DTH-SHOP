import { Component } from 'react';
import { hashTargetsDisclosure } from './commerce17.logic.mjs';

/** Native keyboard disclosure. Content is kept mounted; no height timer or focus trap. */
export default class Disclosure extends Component {
  node = null;
  setNode = node => { this.node = node; };
  revealHash = () => {
    if (!this.node || !hashTargetsDisclosure(window.location.hash, this.props.id)) return;
    this.node.open = true;
    this.node.scrollIntoView({ block: 'start', behavior: 'auto' });
  };
  componentDidMount() {
    window.addEventListener('hashchange', this.revealHash);
    this.revealHash();
  }
  componentDidUpdate(previous) { if (previous.id !== this.props.id) this.revealHash(); }
  componentWillUnmount() { window.removeEventListener('hashchange', this.revealHash); }
  render() {
    const { id, title, children, motion = false, onOpenChange } = this.props;
    return <details ref={this.setNode} id={id} className="ux17-disclosure" data-motion={motion ? 'on' : 'off'}
      onToggle={event => { if (event.target === event.currentTarget) onOpenChange?.(event.currentTarget.open); }}>
      <summary><span>{title}</span><span className="ux17-plus" aria-hidden="true">+</span></summary>
      <div className="ux17-disclosure-body">{children}</div>
    </details>;
  }
}
