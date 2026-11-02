import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState, type FormEvent } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const Route = createFileRoute('/auth')({ component: AuthPage });

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin'|'signup'|'reset'>('signin');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault(); setBusy(true); setMessage('');
    try {
      if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/auth` });
        if (error) throw error;
        setMessage('Check your email for password recovery instructions.');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.session) await navigate({ to: '/dashboard' });
        else setMessage('Check your email to confirm your account, then sign in.');
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await navigate({ to: '/dashboard' });
      }
    } catch (err) { setMessage(err instanceof Error ? err.message : 'Unable to authenticate.'); }
    finally { setBusy(false); }
  }
  return <main className="min-h-screen flex items-center justify-center bg-background p-4">
    <section className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
      <h1 className="text-2xl font-semibold">Menu Cost Pro</h1>
      <p className="mt-1 text-sm text-muted-foreground">Secure restaurant costing and pricing</p>
      <h2 className="mt-7 mb-4 text-lg font-medium">{mode === 'signin' ? 'Sign in' : mode === 'signup' ? 'Create account' : 'Reset password'}</h2>
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm">Email<input className="mt-1 w-full rounded-md border bg-background p-2" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label>
        {mode !== 'reset' && <label className="block text-sm">Password<input className="mt-1 w-full rounded-md border bg-background p-2" type="password" minLength={6} autoComplete={mode==='signup'?'new-password':'current-password'} required value={password} onChange={e=>setPassword(e.target.value)}/></label>}
        <button disabled={busy} className="w-full rounded-md bg-primary p-2 font-medium text-primary-foreground disabled:opacity-50">{busy ? 'Please wait…' : mode==='signin'?'Sign in':mode==='signup'?'Create account':'Send reset email'}</button>
      </form>
      {message && <p role="status" className="mt-4 text-sm">{message}</p>}
      <div className="mt-5 flex flex-wrap gap-4 text-sm underline">
        {mode!=='signin' && <button onClick={()=>{setMode('signin');setMessage('');}}>Sign in</button>}
        {mode!=='signup' && <button onClick={()=>{setMode('signup');setMessage('');}}>Create account</button>}
        {mode!=='reset' && <button onClick={()=>{setMode('reset');setMessage('');}}>Forgot password?</button>}
      </div>
    </section>
  </main>;
}
