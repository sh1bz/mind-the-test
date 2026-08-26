<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { fmtLong } from '$lib/ui/derive';
	import Calendar from './Calendar.svelte';
	import Ic from './Ic.svelte';
	let email = $state('');
	let sent = $state(false);
	let err = $state<string | null>(null);
	let busy = $state(false);
	let editDate = $state(false);
	let confirm = $state<'reset' | 'delete' | null>(null);
	let importMsg = $state<string | null>(null);
	let file: HTMLInputElement;
	async function send(e: Event) {
		e.preventDefault(); busy = true; err = null;
		const r = await app.signIn(email.trim()); busy = false;
		if (r) err = r; else sent = true;
	}
	function exportAll() {
		const a = document.createElement('a');
		a.href = URL.createObjectURL(new Blob([app.exportBlob()], { type: 'application/json' }));
		a.download = `mind-the-test-${new Date().toISOString().slice(0, 10)}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 60_000);
	}
	async function importFile() { const f = file.files?.[0]; if (!f) return; importMsg = app.importBlob(await f.text()) ? 'Imported and merged.' : 'That file is not a progress export.'; file.value = ''; }
	const syncWord = $derived(app.user ? app.sync : 'local');
</script>

<div class="datehd">Mind the Test</div>
<h1 class="large">Account</h1>

{#if app.user}
	<div class="list">
		<div class="lrow ic-sep"><Ic name="cloud" color="var(--blue)" />Signed in<span class="v num">sync · {syncWord}</span></div>
		<button class="lrow" type="button" onclick={() => app.signOut()}><span style="color:var(--blue)">Sign out</span></button>
	</div>
	<p class="muted small" style="padding:0 4px">Your progress follows you to any device where you sign in with the same email. Your email is never shown in the app.</p>
{:else if sent}
	<div class="card">
		<div class="hd"><Ic name="mail" color="var(--blue)" sm />Check your email</div>
		<p style="font-size:15px">We sent a link to <b>{email}</b>. Open it on this device and you are signed in. It can take a minute.</p>
		<button class="chip tint" type="button" style="margin-top:12px" onclick={() => (sent = false)}>Use a different email</button>
	</div>
{:else}
	<div class="card">
		<div class="hd"><Ic name="cloud" color="var(--blue)" sm />Keep your progress everywhere</div>
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

<div class="sec"><h2>Data</h2></div>
<div class="list">
	<button class="lrow ic-sep" type="button" onclick={exportAll}><Ic name="download" color="var(--green)" />Export progress<span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => file.click()}><Ic name="upload" color="var(--teal)" />Import a file<span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => (confirm = confirm === 'reset' ? null : 'reset')}><Ic name="review" color="var(--orange)" />Reset progress<span class="chev">›</span></button>
	<button class="lrow ic-sep" type="button" onclick={() => (confirm = confirm === 'delete' ? null : 'delete')}><Ic name="trash" color="var(--red)" /><span style="color:var(--red)">Delete my data</span><span class="v">{app.user ? 'server and this device' : 'this device'}</span></button>
</div>
<input type="file" accept="application/json,.json" bind:this={file} onchange={importFile} class="sr" aria-label="Import a progress file" />
{#if importMsg}<p class="muted small" style="padding:0 4px">{importMsg}</p>{/if}
{#if confirm === 'reset'}
	<div class="note">Start again from zero? Your test date stays.</div>
	<div class="row"><button class="chip danger" type="button" onclick={async () => { const exam = app.progress.exam; await app.reset(); app.setExam(exam); confirm = null; }}>Yes, reset</button><button class="chip" type="button" onclick={() => (confirm = null)}>Cancel</button></div>
{/if}
{#if confirm === 'delete'}
	<div class="note">{app.user ? 'Removes your progress from the server, signs you out, and clears this device.' : 'Clears all progress on this device.'}</div>
	<div class="row"><button class="chip danger" type="button" onclick={async () => { await app.deleteEverything(); confirm = null; }}>Yes, delete everything</button><button class="chip" type="button" onclick={() => (confirm = null)}>Cancel</button></div>
{/if}
