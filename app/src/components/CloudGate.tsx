import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import App from '../App';
import { acceptInvite, appleSignInEnabled, createFamily, getMyFamily, supabase, type Family } from '../lib/cloud';
import { useCloudState } from '../lib/useCloudState';
import { Field } from './common';

/** Cloud mode: sign in → create or join a family → the app. */
export function CloudGate() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  const [family, setFamily] = useState<Family | null | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const inviteFromLink = new URLSearchParams(location.search).get('invite') ?? '';

  useEffect(() => {
    supabase!.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase!.auth.onAuthStateChange((_event, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  const userId = session?.user.id;
  useEffect(() => {
    if (!userId) { setFamily(undefined); return; }
    getMyFamily(userId).then(setFamily, (e: Error) => setError(e.message));
  }, [userId]);

  if (session === undefined) return <Splash />;
  if (!session) return <SignIn invite={inviteFromLink} />;
  if (error) return <Shell><p className="card warn">{error}</p><button className="btn" onClick={() => location.reload()}>Try again</button></Shell>;
  if (family === undefined) return <Splash />;
  if (!family) return <FamilySetup invite={inviteFromLink} email={session.user.email} onReady={() => getMyFamily(session.user.id).then(setFamily)} />;
  return <CloudApp family={family} email={session.user.email ?? ''} />;
}

function CloudApp({ family, email }: { family: Family; email: string }) {
  const [state, update, status] = useCloudState(family.id);
  useEffect(() => {
    // Done with the invite link - tidy the address bar so it isn't bookmarked or shared by accident.
    if (location.search.includes('invite=')) history.replaceState(null, '', location.pathname);
  }, []);
  return <App state={state} update={update} cloud={{ family, email, status, signOut: () => void supabase!.auth.signOut() }} />;
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <main className="page">
      <div className="onboarding stack narrow">
        <div className="hero">
          <div className="hero-icon" aria-hidden>🏡</div>
          <h1>Family Huddle</h1>
        </div>
        {children}
      </div>
    </main>
  );
}

function Splash() {
  return <Shell><p className="muted center">Loading…</p></Shell>;
}

function SignIn({ invite }: { invite: string }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bring the user back to the same address (keeps any ?invite= code).
  const redirectTo = location.href;

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase!.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo } });
    setBusy(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <Shell>
      <p className="center">
        {invite ? "You've been invited to a family plan. Sign in to join." : 'Turn school and sports schedules into a plan the whole family can see.'}
      </p>
      <section className="card">
        {sent ? (
          <>
            <h2>📬 Check your email</h2>
            <p>We sent a sign-in link to <strong>{email}</strong>. Open it on this device.</p>
            <button className="btn" onClick={() => setSent(false)}>Use a different email</button>
          </>
        ) : (
          <form onSubmit={sendLink}>
            <h2>Sign in</h2>
            <p className="small muted">No password needed. We'll email you a link.</p>
            <Field label="Email">
              <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
            </Field>
            {error && <p className="card warn small" role="alert">{error}</p>}
            <button className="btn primary big" disabled={busy}>{busy ? 'Sending…' : 'Email me a sign-in link'}</button>
          </form>
        )}
        {appleSignInEnabled && !sent && (
          <>
            <div className="or"><span>or</span></div>
            <button className="btn big" onClick={() => supabase!.auth.signInWithOAuth({ provider: 'apple', options: { redirectTo } })}>
              Sign in with Apple
            </button>
          </>
        )}
      </section>
      <p className="small muted center">🔒 Your family's plan is private to the people you invite.</p>
    </Shell>
  );
}

function FamilySetup({ invite, email, onReady }: { invite: string; email?: string; onReady: () => void }) {
  const [mode, setMode] = useState<'create' | 'join'>(invite ? 'join' : 'create');
  const [name, setName] = useState('');
  const [code, setCode] = useState(invite);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (mode === 'create') await createFamily(name);
      else await acceptInvite(code);
      onReady();
    } catch (err) {
      setError((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <Shell>
      <p className="center small muted">Signed in as {email}</p>
      <div className="segmented center-self" role="group">
        <button aria-pressed={mode === 'create'} onClick={() => setMode('create')}>Start a family</button>
        <button aria-pressed={mode === 'join'} onClick={() => setMode('join')}>Join with a code</button>
      </div>
      <form className="card" onSubmit={submit}>
        {mode === 'create' ? (
          <>
            <h2>Name your family</h2>
            <Field label="Family name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="The McIntoshes" maxLength={80} /></Field>
            <p className="small muted">Next you'll add the kids, then invite your partner.</p>
          </>
        ) : (
          <>
            <h2>Join your family</h2>
            <Field label="Invite code" hint="Your partner can make one under Family → Invite.">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" autoCapitalize="characters" autoComplete="off" spellCheck={false} required />
            </Field>
          </>
        )}
        {error && <p className="card warn small" role="alert">{error}</p>}
        <button className="btn primary big" disabled={busy}>{busy ? 'One moment…' : mode === 'create' ? 'Create our family' : 'Join'}</button>
      </form>
      <button className="btn" onClick={() => void supabase!.auth.signOut()}>Sign out</button>
    </Shell>
  );
}
