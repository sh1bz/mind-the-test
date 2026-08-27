<script lang="ts">
	// Placeholder legal copy — review with a solicitor or a template service before relying on it.
	// Rendered inside a Sheet from Account. Contact address: hello@untilitsticks.com.
	let { doc }: { doc: 'privacy' | 'terms' } = $props();
</script>

<div class="legal">
	{#if doc === 'privacy'}
		<p class="muted small">Last updated 27 August 2026.</p>
		<p>Until It Sticks is an independent study aid run by a sole trader in the UK. In this policy “we” means Until It Sticks. To contact us about your data, email <b>hello@untilitsticks.com</b>.</p>

		<h4>What we collect</h4>
		<p><b>Email address</b> — only if you sign in. We use it to send your one-time sign-in link and to sync your progress across your devices. Your email is never shown inside the app.</p>
		<p><b>Learning progress</b> — which questions you have answered and how you did, so the app can plan your revision. It is kept on your device, and also on our database if you sign in.</p>
		<p><b>Payment</b> — if you buy full access, Stripe processes the payment. We never see or store your card details. We receive only your email and confirmation that the payment succeeded.</p>

		<h4>What we do not do</h4>
		<p>We do not show ads, sell your data, or track you across other websites. Our analytics is privacy-first and cookieless, and does not identify you.</p>

		<h4>Who processes your data</h4>
		<p>Supabase (sign-in and progress storage), Stripe (payments), Resend (sending the sign-in email), and Cloudflare (hosting and privacy-first analytics). Each acts on our instructions.</p>

		<h4>Cookies and storage</h4>
		<p>We use only local storage on your device to keep you signed in and hold your progress. There are no advertising or tracking cookies, so there is no cookie banner.</p>

		<h4>Keeping and deleting your data</h4>
		<p>Progress is kept while your account exists. You can remove it at any time in Account → Data → Delete my data, which clears it from our database and this device.</p>

		<h4>Your rights</h4>
		<p>Under UK GDPR you can access, correct, or delete your data, and object to how we use it. Use the Data section, or email us. You can also complain to the Information Commissioner’s Office (ico.org.uk).</p>
	{:else}
		<p class="muted small">Last updated 27 August 2026.</p>

		<h4>About the service</h4>
		<p>Until It Sticks is a practice tool for the Life in the UK Test. It is an <b>independent study aid</b> and is not affiliated with, endorsed by, or connected to the Home Office, UK Visas and Immigration, or the official Life in the UK Test. The practice questions are our own and are not the official test questions. We do not guarantee that you will pass.</p>

		<h4>Free and full access</h4>
		<p>Part of the app is free. Full access is a one-off payment of £4.99 and unlocks all questions and unlimited mock exams for this product.</p>

		<h4>Payment</h4>
		<p>Payment is handled securely by Stripe. Access is linked to the email you pay with — sign in with that email to unlock.</p>

		<h4>Immediate access and your right to cancel</h4>
		<p>Full access is digital content supplied immediately. When you buy, you ask us to give access straight away and you agree that you lose your 14-day right to cancel once access is unlocked (Consumer Contracts Regulations 2013). If access has not yet been unlocked, contact us for a refund.</p>

		<h4>Availability and liability</h4>
		<p>We aim to keep the app working but provide it “as is” and cannot promise it will always be available or error-free. To the extent allowed by law, we are not liable for indirect or consequential loss. Nothing here limits liability that cannot be limited by law.</p>

		<h4>Governing law</h4>
		<p>These terms are governed by the law of England and Wales. Contact: <b>hello@untilitsticks.com</b>.</p>
	{/if}
</div>

<style>
	.legal { display: flex; flex-direction: column; gap: 10px; padding: 0 4px 4px; }
	.legal h4 { margin: 8px 0 0; font-size: 15px; font-weight: 700; letter-spacing: -0.2px; }
	.legal p { margin: 0; font-size: 14px; line-height: 1.5; color: var(--ink2); }
	.legal p.muted { color: var(--muted); }
</style>
