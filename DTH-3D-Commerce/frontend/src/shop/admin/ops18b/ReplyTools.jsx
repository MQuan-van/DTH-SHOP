import {useState,useRef} from 'react';
import {REPLIES,appendReply} from './opsPro.logic.mjs';
import ProIcon from './ProIcon';
import s from './adminPro.module.css';
export default function ReplyTools({draft,disabled,onInsert}) {
  const [open,setOpen]=useState(false),[error,setError]=useState('');const root=useRef(null),button=useRef(null);
  return <div className={s.replyTools} ref={root} onKeyDown={e=>{if(e.key==='Escape'&&open){e.preventDefault();e.stopPropagation();setOpen(false);button.current?.focus();}}}>
    <button ref={button} className={s.replyToggle} type="button" aria-expanded={open} disabled={disabled} onClick={()=>{setOpen(x=>!x);setError('');}}><ProIcon name="note" size={15}/>Reply templates</button><span>Insert, review, then send.</span>
    {open&&<div className={s.replyOptions} role="group" aria-label="Reply templates">{REPLIES.map(r=><button type="button" key={r.id} disabled={disabled} title={r.text} onClick={()=>{
      const next=appendReply(draft,r.text);if(next===null){setError('This reply would exceed 3,000 characters. Shorten the draft first.');return;}
      onInsert(next);setOpen(false);setError('');root.current?.closest('form')?.querySelector('textarea')?.focus();
    }}>{r.label}</button>)}</div>}{error&&<span role="alert">{error}</span>}
  </div>;
}
