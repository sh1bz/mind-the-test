<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { nav } from '$lib/ui/nav.svelte';
	import { fmtLong } from '$lib/ui/derive';
	import { FREE_QUESTIONS, FREE_MOCKS, PRICE, freeUsed } from '$lib/engine/gate';
	import Calendar from './Calendar.svelte';
	import Ic from './Ic.svelte';
	import Sheet from './Sheet.svelte';
	import Feedback from './Feedback.svelte';
	import Legal from './Legal.svelte';
	import Contact from './Contact.svelte';
	let email = $state('');
	let sent = $state(false);
	let err = $state<string | null>(null);
	let busy = $state(false);
	let editDate = $state(false);
	let confirm = $state<'reset' | 'delete' | null>(null);
	let feedback = $state(false);
	let legal = $state<'privacy' | 'terms' | null>(null);
	let contact = $state(false);
	async function send(e: Event) {
		e.preventDefault(); busy = true; err = null;
		const r = await app.signIn(email.trim()); busy = false;
		if (r) err = r; else sent = true;
	}
	const syncWord = $derived(app.user ? app.sync : 'local');
	const used = $derived(freeUsed(app.gate));
</script>

<h1 class="large">Account</h1>

{#if app.user}
	<div class="list">
		<div class="lrow ic-sep"><Ic name="cloud" color="var(--blue)" />Signed in<span class="v num">sync · {syncWord}</span></div>
		<div class="lrow ic-sep"><Ic name="mail" color="var(--blue)" />Email<span class="v" style="color:var(--ink);font-size:13px">{app.user.email}</span></div>
		<button class="lrow" type="button" onclick={() => app.signOut()}><span style="color:var(--blue)">Sign out</span></button>
	</div>
	<p class="muted small" style="padding:0 4px">Your progress follows you to any device where you sign in with this email.</p>
{:else if sent}
	<div class="card">
		<div class="hd"><Ic name="mail" color="var(--blue)" sm />Check your email</div>
		<p style="font-size:15px">We sent a link to <b>{email}</b>. Open it on any device and you are signed in. It can take a minute.</p>
		<button class="chip tint" type="button" style="margin-top:12px" onclick={() => (sent = false)}>Use a different email</button>
	</div>
{:else}
	<div class="card">
		<div class="hd"><Ic name="cloud" color="var(--blue)" sm />Keep your progress everywhere</div>
		{#if app.linkError}<div class="verdict" style="margin-bottom:12px"><b>Link not valid</b>{app.linkError}</div>{/if}
		<p class="muted" style="font-size:15px;margin-bottom:12px">Enter your email. We send a link; tap it and you are signed in. No password, no name, and your email is never shown in the app.</p>
		<form onsubmit={send} style="display:flex;flex-direction:column;gap:10px">
			<input class="field" type="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email" bind:value={email} disabled={!app.cloud} style="background:var(--bg)" />
			<button class="big" type="submit" disabled={busy || !app.cloud}>{busy ? 'Sending…' : 'Send me a link'} <span class="arrow">›</span></button>
		</form>
		{#if err}<div class="verdict" style="margin-top:10px"><b>Could not send</b>{err}</div>{/if}
	</div>
	<p class="muted small" style="padding:0 4px">{app.cloud ? 'Signed out: progress is saved in this browser only. Signing in merges it into your account — nothing is lost.' : 'Cloud sync is off in this build. Progress is saved in this browser only.'}{#if !app.storageOk} <b>This browser blocks storage; progress will not survive a reload.</b>{/if}</p>
{/if}

<div class="sec"><h2>Test date</h2></div>
{#if editDate}
	<div class="card" style="display:flex;flex-direction:column;gap:8px">
		<Calendar value={app.progress.exam} onpick={(iso) => { app.setExam(iso); editDate = false; }} />
		<div class="row"><button class="chip" type="button" onclick={() => { app.setExam(undefined); editDate = false; }}>No date yet</button><button class="chip tint" type="button" onclick={() => (editDate = false)}>Cancel</button></div>
	</div>
{:else}
	<div class="list">
		<button class="lrow ic-sep" type="button" onclick={() => (editDate = true)}><Ic name="calendar" color="var(--red)" />{app.progress.exam ? fmtLong(app.progress.exam) : 'Not set'}<span class="v" style="color:var(--blue)">{app.progress.exam ? 'Change' : 'Set'}</span><span class="chev">›</span></button>
	</div>
{/if}

<div class="sec"><h2>Unlock</h2></div>
<div class="list">
	{#if app.paid}
		<div class="lrow ic-sep"><Ic name="check" color="var(--green)" />Full access<span class="v" style="color:var(--green);font-size:15px">Unlocked</span></div>
	{:else}
		<button class="lrow ic-sep" type="button" onclick={() => (nav.paywall = 'gate')}><Ic name="star" color="var(--blue)" />Full access<span class="v muted" style="font-size:15px;font-weight:400">{PRICE} once</span><span class="chev">›</span></button>
	{/if}
</div>
{#if !app.paid}<p class="muted small" style="padding:0 4px">Free: {FREE_QUESTIONS} questions and {FREE_MOCKS} mock. You have used {used.questions} and {used.mocks}.</p>{/if}

<div class="sec"><h2>Help</h2></div>
<div class="list">
	<button class="lrow ic-sep" type="button" onclick={() => nav.showOnboarding()}><Ic name="book" color="var(--indigo)" />How it works<span class="chev">›</span></button>
	<a class="lrow ic-sep" href="/life-in-the-uk-test/" data-sveltekit-reload style="text-decoration:none"><Ic name="flag" color="var(--blue)" />About the test<span class="chev">›</span></a>
	<button class="lrow ic-sep" type="button" onclick={() => (contact = true)}><Ic name="mail" color="var(--blue)" />Contact support<span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => (feedback = true)}><Ic name="mail" color="var(--teal)" />Send feedback<span class="chev">›</span></button>
</div>

<div class="sec"><h2>Data</h2></div>
<div class="list">
	<button class="lrow ic-sep" type="button" onclick={() => (confirm = 'reset')}><Ic name="review" color="var(--orange)" />Reset progress<span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => (confirm = 'delete')}><Ic name="trash" color="var(--red)" /><span style="color:var(--red)">Delete my data</span><span class="v">{app.user ? 'server and this device' : 'this device'}</span></button>
</div>
<div class="sec"><h2>Legal</h2></div>
<div class="list">
	<button class="lrow ic-sep" type="button" onclick={() => (legal = 'privacy')}><Ic name="cloud" color="var(--indigo)" />Privacy &amp; data<span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => (legal = 'terms')}><Ic name="flag" color="var(--blue)" />Terms &amp; refunds<span class="chev">›</span></button>
</div>
<p class="muted small" style="padding:0 4px">Until It Sticks is an independent study aid. It is not affiliated with the Home Office or the official Life in the UK Test, and passing is not guaranteed.</p>

{#if feedback}
	<Sheet label="Send feedback" close="Done" onclose={() => (feedback = false)}>
		<Feedback skip={false} />
	</Sheet>
{/if}
{#if legal}
	<Sheet label={legal === 'privacy' ? 'Privacy & data' : 'Terms & refunds'} close="Done" onclose={() => (legal = null)}>
		<Legal doc={legal} />
	</Sheet>
{/if}
{#if contact}
	<Sheet label="Contact support" close="Close" onclose={() => (contact = false)}>
		<Contact onclose={() => (contact = false)} />
	</Sheet>
{/if}
{#if confirm === 'reset'}
	<Sheet label="Reset progress" close="Cancel" onclose={() => (confirm = null)}>
		<div class="note">Start again from zero? Your test date stays.</div>
		<div class="row"><button class="chip danger" type="button" onclick={async () => { const exam = app.progress.exam; await app.reset(); app.setExam(exam); confirm = null; }}>Yes, reset</button></div>
	</Sheet>
{/if}
{#if confirm === 'delete'}
	<Sheet label="Delete my data" close="Cancel" onclose={() => (confirm = null)}>
		<div class="note">{app.user ? 'Removes your progress from the server, signs you out, and clears this device.' : 'Clears all progress on this device.'}</div>
		<div class="row"><button class="chip danger" type="button" onclick={async () => { await app.deleteEverything(); confirm = null; }}>Yes, delete everything</button></div>
	</Sheet>
{/if}
