// C1 Coach: one coach identity, four modes. Mode changes stance, not identity or access (FR-06).
// The context chip shows exactly what the coach can see; proposals only apply on user action.

import { useEffect, useRef, useState } from 'react';
import { resolveContext } from '../coach/context';
import { coach } from '../coach/service';
import { PageHeader } from '../components/ui';
import { now, uid } from '../lib/id';
import { formatDateTime, MODE_BLURB, MODE_LABEL } from '../lib/labels';
import { coachHref, navigate } from '../lib/router';
import { useStore } from '../lib/store';
import { acceptIntoDraft } from '../lib/studio';
import type { AppState, CoachContext, CoachContextType, CoachConversation, CoachMessage, CoachMode } from '../lib/types';

const MODES: CoachMode[] = ['instructor', 'mentor', 'editor', 'partner'];
const CONTEXT_TYPES: CoachContextType[] = ['none', 'lesson', 'exercise', 'attempt', 'project', 'draft'];

const STARTERS: Record<CoachMode, string[]> = {
  instructor: ['What is subtext?', 'How do I make a scene turn?', 'Explain showing vs telling on screen'],
  mentor: ['I’m not sure what this is really about', 'I’m stuck on the ending', 'Help me decide what to work on next'],
  editor: ['What’s the weakest moment here?', 'Where does the rhythm drag?', 'Show me another version of the line that names a feeling'],
  partner: ['Give me five ways into this', 'What if it were told from someone else’s view?', 'Ideas for an opening image'],
};

const sameCtx = (a: CoachContext, b: CoachContext) => a.type === b.type && (a.id ?? '') === (b.id ?? '');

function backLink(s: AppState, ctx: CoachContext): { href: string; label: string } | undefined {
  switch (ctx.type) {
    case 'lesson': return { href: `#/academy/lesson/${ctx.id}`, label: 'Back to the lesson' };
    case 'exercise': return { href: `#/academy/exercise/${ctx.id}`, label: 'Back to the exercise' };
    case 'attempt': return { href: `#/academy/attempt/${ctx.id}`, label: 'Back to your feedback' };
    case 'project': return { href: `#/studio/project/${ctx.id}`, label: 'Back to the project' };
    case 'draft': return s.drafts.some((d) => d.id === ctx.id) ? { href: `#/studio/draft/${ctx.id}`, label: 'Back to the draft' } : undefined;
    default: return undefined;
  }
}

export function CoachScreen({ query }: { query: URLSearchParams }) {
  const { state, update } = useStore();
  const rawType = query.get('ctx') as CoachContextType | null;
  const ctx: CoachContext = rawType && CONTEXT_TYPES.includes(rawType) ? { type: rawType, id: query.get('id') ?? undefined } : { type: 'none' };
  const convId = query.get('c');
  const existing = convId
    ? state.conversations.find((c) => c.id === convId)
    : [...state.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).find((c) => sameCtx(c.context, ctx));
  const context = existing?.context ?? ctx;
  const qMode = query.get('mode') as CoachMode | null;
  const [mode, setMode] = useState<CoachMode>(qMode && MODES.includes(qMode) ? qMode : existing?.mode ?? state.profile.preferredMode);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const { context: resolved, withheld } = resolveContext(state, context);
  const back = backLink(state, context);
  const messages = existing?.messages ?? [];

  useEffect(() => { endRef.current?.scrollIntoView({ block: 'end' }); }, [messages.length, busy]);

  const switchMode = (m: CoachMode) => {
    setMode(m);
    if (existing) update((s) => ({ ...s, conversations: s.conversations.map((c) => (c.id === existing.id ? { ...c, mode: m } : c)) }));
  };

  const send = async (text: string) => {
    const msg = text.trim();
    if (!msg || busy) return;
    setInput('');
    setBusy(true);
    const t = now();
    const id = existing?.id ?? uid('conv');
    const userMsg: CoachMessage = { id: uid('msg'), role: 'user', mode, text: msg, createdAt: t };
    update((s) => {
      const conv = s.conversations.find((c) => c.id === id);
      const next: CoachConversation = conv
        ? { ...conv, mode, messages: [...conv.messages, userMsg], updatedAt: t }
        : { id, mode, context, permissionSnapshot: { ...s.profile.permissions }, messages: [userMsg], createdAt: t, updatedAt: t };
      return { ...s, conversations: conv ? s.conversations.map((c) => (c.id === id ? next : c)) : [...s.conversations, next] };
    });
    if (!convId) navigate(coachHref({ mode, ctx: context.type, id: context.id, conversation: id }).slice(1), { replace: true });

    const reply = await coach.reply({
      mode,
      message: msg,
      context: resolved,
      history: messages.map((m) => ({ role: m.role, text: m.text, mode: m.mode })),
    });
    const coachMsg: CoachMessage = {
      id: uid('msg'),
      role: 'coach',
      mode,
      text: reply.text,
      usedContext: resolved.labels,
      proposal: reply.proposal ? { ...reply.proposal, status: 'pending' } : undefined,
      createdAt: now(),
    };
    update((s) => ({
      ...s,
      conversations: s.conversations.map((c) => (c.id === id ? { ...c, messages: [...c.messages, coachMsg], updatedAt: coachMsg.createdAt } : c)),
    }));
    setBusy(false);
  };

  const patchMessage = (msgId: string, patch: Partial<CoachMessage>) => update((s) => ({
    ...s,
    conversations: s.conversations.map((c) => (c.id !== existing?.id ? c : { ...c, messages: c.messages.map((m) => (m.id === msgId ? { ...m, ...patch } : m)) })),
  }));

  const accept = (m: CoachMessage) => {
    if (!m.proposal) return;
    const proposal = m.proposal;
    update((s) => {
      let next = s;
      if (proposal.target === 'draft' && resolved.draft) next = acceptIntoDraft(s, resolved.draft.id, proposal.text);
      if (proposal.target === 'ideas') {
        const ideas = proposal.text.split('\n').map((x) => x.trim()).filter(Boolean)
          .map((text) => ({ id: uid('idea'), text: `${text} (from Creative Partner)`, tags: ['coach'], createdAt: now(), projectId: resolved.project?.id }));
        next = { ...s, ideas: [...ideas, ...s.ideas] };
      }
      return next;
    });
    patchMessage(m.id, { proposal: { ...proposal, status: 'accepted' } });
  };

  const forget = () => {
    if (!existing || !confirm('Forget this conversation? It will be deleted from this device.')) return;
    update((s) => ({ ...s, conversations: s.conversations.filter((c) => c.id !== existing.id) }));
    navigate(coachHref({ mode }).slice(1), { replace: true });
  };

  const recent = [...state.conversations].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).filter((c) => c.id !== existing?.id).slice(0, 5);

  return (
    <>
      <PageHeader space="coach" title="Coach" crumbs={back ? [{ href: back.href, label: `← ${back.label}` }] : undefined}>
        {coach.isSample && (
          <p className="small" style={{ margin: 0 }}>
            <span className="pill sample">Sample coach</span> Replies come from simple rules running in your browser — not AI. Nothing is sent anywhere.
          </p>
        )}
      </PageHeader>

      <div className="mode-tabs" role="tablist" aria-label="Coach mode">
        {MODES.map((m) => (
          <button key={m} role="tab" className="choice" aria-selected={mode === m} aria-pressed={mode === m} onClick={() => switchMode(m)}>
            {MODE_LABEL[m]}
          </button>
        ))}
      </div>
      <p className="small muted" style={{ margin: '6px 0 12px' }}>{MODE_BLURB[mode]} Same coach, same context — only the approach changes.</p>

      <div className="card" style={{ padding: 12 }}>
        <div className="row between">
          <span className="context-chip" title="Exactly what the coach can see in this conversation">👁 Can see: {resolved.labels.join(' · ')}</span>
          <div className="row">
            {context.type !== 'none' && <a className="btn small" href={coachHref({ mode })}>Start context-free</a>}
            {existing && <button className="btn small ghost danger" onClick={forget}>Forget this conversation</button>}
          </div>
        </div>
        {withheld.length > 0 && (
          <ul className="small muted" style={{ margin: '8px 0 0', paddingLeft: 18 }}>
            {withheld.map((w) => <li key={w}>Not shared: {w}</li>)}
          </ul>
        )}
        {existing && existing.permissionSnapshot.studioForPersonalization !== state.profile.permissions.studioForPersonalization && (
          <p className="small muted" style={{ margin: '6px 0 0' }}>Your permissions changed since this conversation started; new replies follow your current settings.</p>
        )}
      </div>

      <div className="chat" style={{ margin: '16px 0' }}>
        {messages.length === 0 && (
          <div className="empty">
            <p style={{ marginTop: 0 }}>Ask anything, or try one of these:</p>
            <div className="row" style={{ justifyContent: 'center' }}>
              {STARTERS[mode].map((s) => <button key={s} className="btn small" onClick={() => void send(s)}>{s}</button>)}
            </div>
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={`msg ${m.role}`}>
            {m.role === 'coach' && <div className="small" style={{ fontWeight: 650, color: 'var(--coach)', marginBottom: 4 }}>💬 Coach · {MODE_LABEL[m.mode]}</div>}
            {m.text}
            {m.proposal && (
              <div className="proposal">
                <div className="small" style={{ fontWeight: 650 }}>{m.proposal.target === 'draft' ? 'Suggested text — yours to take, change, or ignore' : 'Save these as ideas?'}</div>
                <pre className="writing" style={{ whiteSpace: 'pre-wrap', margin: '6px 0', fontSize: '.95rem' }}>{m.proposal.text}</pre>
                {m.proposal.status === 'pending' ? (
                  <div className="row">
                    <button className="btn small primary" style={{ background: 'var(--coach)', borderColor: 'var(--coach)' }} onClick={() => accept(m)}>
                      {m.proposal.target === 'draft' ? 'Add to the end of my draft' : 'Save to my idea inbox'}
                    </button>
                    <button className="btn small" onClick={() => patchMessage(m.id, { proposal: { ...m.proposal!, status: 'rejected' } })}>No thanks</button>
                  </div>
                ) : (
                  <div className="small muted">
                    {m.proposal.status === 'accepted'
                      ? (m.proposal.target === 'draft' ? '✓ Added to your draft (a version was saved first).' : '✓ Saved to your idea inbox.')
                      : 'Not used.'}
                  </div>
                )}
              </div>
            )}
            {m.role === 'coach' && (
              <div className="meta row between">
                <span>Used: {m.usedContext?.join(' · ') || 'nothing'} · {formatDateTime(m.createdAt)}</span>
                <span className="row" style={{ gap: 4 }}>
                  <button className="btn small ghost" aria-pressed={m.rating === 'helpful'} onClick={() => patchMessage(m.id, { rating: m.rating === 'helpful' ? undefined : 'helpful' })}>👍 Helpful</button>
                  <button className="btn small ghost" aria-pressed={m.rating === 'not_helpful'} onClick={() => patchMessage(m.id, { rating: m.rating === 'not_helpful' ? undefined : 'not_helpful' })}>👎 Not helpful</button>
                </span>
              </div>
            )}
          </div>
        ))}
        {busy && <div className="msg coach muted">Thinking…</div>}
        <div ref={endRef} />
      </div>

      <form className="composer" onSubmit={(e) => { e.preventDefault(); void send(input); }}>
        <div className="row" style={{ alignItems: 'flex-end' }}>
          <textarea
            aria-label={`Message the coach (${MODE_LABEL[mode]})`}
            placeholder={`Ask the ${MODE_LABEL[mode]}…`}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(input); } }}
            style={{ flex: 1, minHeight: 52 }}
          />
          <button className="btn primary" style={{ background: 'var(--coach)', borderColor: 'var(--coach)' }} type="submit" disabled={!input.trim() || busy}>Send</button>
        </div>
      </form>

      {recent.length > 0 && (
        <>
          <h2 className="section">Earlier conversations</h2>
          <ul className="list card">
            {recent.map((c) => {
              const r = resolveContext(state, c.context).context.labels[0];
              return (
                <li key={c.id} className="row between">
                  <a href={coachHref({ mode: c.mode, ctx: c.context.type, id: c.context.id, conversation: c.id })}>
                    {r}
                  </a>
                  <span className="small muted">{MODE_LABEL[c.mode]} · {formatDateTime(c.updatedAt)}</span>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </>
  );
}
