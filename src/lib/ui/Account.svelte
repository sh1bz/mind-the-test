<script lang="ts">
	import { app } from '$lib/store/app.svelte';
	import { fmtLong } from '$lib/ui/derive';
	import Calendar from './Calendar.svelte';
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
		a.download = `mind-the-test-${new Date().toISOString().slice(0, 10)}.json`; a.click(); URL.revokeObjectURL(a.href);
	}
	async function importFile() { const f = file.files?.[0]; if (!f) return; importMsg = app.importBlob(await f.text()) ? 'Imported and merged.' : 'That file is not a progress export.'; file.value = ''; }
	const syncWord = $derived(app.user ? app.sync : 'local');
</script>

{#if app.user}
	<h1 class="display" style="font-size:22px;margin-top:6px">Signed in</h1>
	<p class="muted" style="font-size:13.5px">Your progress follows you to any device where you sign in with the same email. Your email is never shown in the app.</p>
	<div class="row"><span class="chip">Sync · {syncWord}</span><button class="chip" type="button" onclick={() => app.signOut()}>Sign out</button></div>
{:else if sent}
	<h1 class="display" style="font-size:22px;margin-top:6px">Check your email</h1>
	<p class="muted" style="font-size:13.5px">We sent a link to <b>{email}</b>. Open it on this device and you are signed in. It can take a minute.</p>
	<button class="chip" type="button" onclick={() => (sent = false)}>Use a different email</button>
{:else}
	<h1 class="display" style="font-size:22px;margin-top:6px">Keep your progress everywhere</h1>
	<p class="muted" style="font-size:13.5px">Enter your email. We send a link; tap it and you are signed in. No password, no name, and your email is never shown in the app.</p>
	<form onsubmit={send} style="display:flex;flex-direction:column;gap:10px">
		<input class="field" type="email" required autocomplete="email" placeholder="you@example.com" aria-label="Email" bind:value={email} disabled={!app.cloud} />
		<button class="big" type="submit" disabled={busy || !app.cloud}>{busy ? 'Sending…' : 'Send me a link'} <span class="arrow">›</span></button>
	</form>
	{#if err}<div class="verdict"><b>Could not send</b>{err}</div>{/if}
	<div class="note">{app.cloud ? 'Signed out: progress is saved in this browser only. Signing in merges it into your account — nothing is lost.' : 'Cloud sync is off in this build. Progress is saved in this browser only.'}{#if !app.storageOk} <b>This browser blocks storage; progress will not survive a reload.</b>{/if}</div>
{/if}

<div class="eyebrow" style="margin-top:6px">Test date</div>
{#if editDate}
	<div class="card" style="display:flex;flex-direction:column;gap:8px">
		<Calendar value={app.progress.exam} onpick={(iso) => { app.setExam(iso); editDate = false; }} />
		<div class="row"><button class="chip" type="button" onclick={() => { app.setExam(undefined); editDate = false; }}>No date yet</button><button class="chip" type="button" onclick={() => (editDate = false)}>Cancel</button></div>
	</div>
{:else}
	<div class="row"><span class="field" style="flex:1">{app.progress.exam ? fmtLong(app.progress.exam) : 'Not set'}</span><button class="chip" type="button" onclick={() => (editDate = true)}>{app.progress.exam ? 'Change' : 'Set'}</button></div>
{/if}

<div class="eyebrow" style="margin-top:6px">Data</div>
<div class="wrapchips">
	<button class="chip" type="button" onclick={exportAll}>Export</button>
	<button class="chip" type="button" onclick={() => file.click()}>Import</button>
	<input type="file" accept="application/json,.json" bind:this={file} onchange={importFile} class="sr" aria-label="Import a progress file" />
	<button class="chip" type="button" onclick={() => (confirm = confirm === 'reset' ? null : 'reset')}>Reset progress</button>
</div>
{#if importMsg}<p class="muted small">{importMsg}</p>{/if}
{#if confirm === 'reset'}
	<div class="note">Start again from zero? Your test date stays.</div>
	<div class="row"><button class="chip danger" type="button" onclick={async () => { const exam = app.progress.exam; await app.reset(); app.setExam(exam); confirm = null; }}>Yes, reset</button><button class="chip" type="button" onclick={() => (confirm = null)}>Cancel</button></div>
{/if}

<div class="row" style="margin-top:auto"><button class="chip danger" type="button" onclick={() => (confirm = confirm === 'delete' ? null : 'delete')}>Delete my data</button><span class="muted small">server and this device</span></div>
{#if confirm === 'delete'}
	<div class="note">Removes your progress from the server{app.user ? ' and signs you out' : ''}, and clears this device.</div>
	<div class="row"><button class="chip danger" type="button" onclick={async () => { await app.deleteEverything(); confirm = null; }}>Yes, delete everything</button><button class="chip" type="button" onclick={() => (confirm = null)}>Cancel</button></div>
{/if}
