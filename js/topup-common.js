// Util bersama untuk halaman topup: render paket, select/qty, accordion, dan kirim checkout.
// Saya menulis ini supaya logika topup tidak duplikat di setiap halaman.
(function () {
	'use strict';

	// formatRp: format angka ke 'Rp' lokal
	function formatRp(n) {
		return 'Rp' + Number(n || 0).toLocaleString('id-ID');
	}

	// renderPacks: bikin tombol paket di #pack-list
	function renderPacks(packs, container) {
		container.innerHTML = '';
		packs.forEach(p => {
			const b = document.createElement('button');
			b.className = 'p-3 border rounded text-left flex flex-col pack-btn theme-card';
			b.innerHTML = '<div class="text-sm mb-2 pack-label">' + p.label + '</div>'
				+ '<div class="mt-auto font-semibold pack-price">' + formatRp(p.price) + '</div>';
			b.dataset.id = p.id;
			b.dataset.price = p.price;
			b.dataset.stock = p.stock;
			b.addEventListener('click', () => selectPack(p.id, packs, container));
			container.appendChild(b);
		});
	}

	// selectPack: tandai paket terpilih, update stok dan total
	function selectPack(id, packs, container) {
		const ctx = container._topupCtx;
		if (!ctx) return;
		ctx.selected = packs.find(x => x.id === id);
		Array.from(container.children).forEach(btn => {
			btn.classList.toggle('selected', btn.dataset.id === id);
		});
		if (ctx.stockEl) ctx.stockEl.textContent = ctx.selected.stock;
		if (ctx.qtyEl) ctx.qtyEl.value = 1;
		updateTotal(ctx);
	}

	// updateTotal: hitung dan tampilkan total
	function updateTotal(ctx) {
		if (!ctx) return;
		const qty = Math.max(1, parseInt(ctx.qtyEl?.value || 1, 10));
		const t = ctx.selected ? ctx.selected.price * qty : 0;
		if (ctx.totalEl) ctx.totalEl.textContent = formatRp(t);
	}

	// setupQty: pasang handler untuk tombol + / - dan input qty
	function setupQty(ctx) {
		ctx.inc?.addEventListener('click', () => { ctx.qtyEl.value = Number(ctx.qtyEl.value || 1) + 1; updateTotal(ctx); });
		ctx.dec?.addEventListener('click', () => { ctx.qtyEl.value = Math.max(1, Number(ctx.qtyEl.value || 1) - 1); updateTotal(ctx); });
		ctx.qtyEl?.addEventListener('input', () => updateTotal(ctx));
	}

	// setupAccordion: buka/tutup metode pembayaran dan tampilkan toast singkat
	function setupAccordion() {
		document.querySelectorAll('.accordion-head').forEach(head => {
			head.addEventListener('click', () => {
				const body = head.nextElementSibling;
				const isHidden = body.classList.contains('hidden');
				document.querySelectorAll('.accordion-body').forEach(b => b.classList.add('hidden'));
				document.querySelectorAll('.accordion-head').forEach(h => h.classList.remove('payment-selected'));
				document.querySelectorAll('.accordion-head svg').forEach(s => s.classList.remove('rotate-180'));
				if (isHidden) {
					body.classList.remove('hidden');
					head.classList.add('payment-selected');
					const svg = head.querySelector('svg');
					if (svg) svg.classList.add('rotate-180');
					// notifikasi singkat supaya user tahu metode dipilih
					setTimeout(() => {
						if (window.showToast) window.showToast('Metode pembayaran: ' + (head.textContent.trim().split('\n')[0] || ''), 'info', 2000);
					}, 80);
				}
			});
		});
	}

	/**
	 * initTopup(opts)
	 * opts = { packs: Array, game: string }
	 * Saya gunakan initTopup dari tiap halaman topup: halaman hanya perlu menyediakan data paket
	 */
	window.initTopup = function (opts) {
		const packs = opts.packs || [];
		const game = opts.game || 'game';

		// Selektor elemen pada halaman (harus konsisten di semua halaman topup)
		const container = document.getElementById('pack-list');
		const stockEl = document.getElementById('stock');
		const qtyEl = document.getElementById('qty');
		const inc = document.getElementById('inc');
		const dec = document.getElementById('dec');
		const totalEl = document.getElementById('total');
		const buyBtn = document.getElementById('buy');
		const contactEmail = document.getElementById('contact-email');
		const contactPhone = document.getElementById('contact-phone');
		const phoneCountry = document.getElementById('phone-country');
		const userid = document.getElementById('userid');
		const zoneid = document.getElementById('zoneid'); // opsional pada beberapa game

		if (!container) return console.warn('initTopup: elemen #pack-list tidak ditemukan');

		// Simpan konteks pada element container supaya fungsi internal dapat mengakses
		container._topupCtx = {
			selected: null, packs,
			container, stockEl, qtyEl, inc, dec, totalEl, buyBtn,
			contactEmail, contactPhone, phoneCountry, userid, zoneid, game
		};

		// Render UI dan pasang handler
		renderPacks(packs, container);
		setupQty(container._topupCtx);
		setupAccordion();

		// Handler tombol Beli: validasi sederhana lalu panggil util checkout global
		buyBtn?.addEventListener('click', async () => {
			const ctx = container._topupCtx;
			const user = ctx.userid?.value?.trim() || '';
			const zone = ctx.zoneid?.value?.trim() || '';
			const email = (ctx.contactEmail && ctx.contactEmail.value || '').trim();
			const phone = (ctx.contactPhone && ctx.contactPhone.value || '').trim();

			// Validasi
			if (!ctx.selected) { (window.showToast || alert)('Pilih paket terlebih dahulu', 'warn'); return; }
			if (ctx.zoneid && (!user || !zone)) { (window.showToast || alert)('Isi User ID dan Zone ID', 'warn'); return; }
			if (!ctx.zoneid && !user) { (window.showToast || alert)('Isi User ID', 'warn'); return; }
			if (!email && !phone) { (window.showToast || alert)('Isi email atau nomor WhatsApp untuk kontak', 'warn'); return; }

			// Konfirmasi metode pembayaran jika belum memilih
			const paymentOpened = Array.from(document.querySelectorAll('.accordion-body')).some(b => !b.classList.contains('hidden'));
			if (!paymentOpened) { if (!confirm('Belum memilih metode pembayaran. Lanjutkan?')) return; }

			// Susun payload dan panggil checkout util
			const payload = {
				game: ctx.game,
				packageId: ctx.selected.id,
				qty: Number(ctx.qtyEl?.value || 1),
				userid: user,
				zoneid: zone || undefined,
				contact: { email, phone }
			};

			// Panggil global checkout; jika tidak ada, fallback alert (developer mode)
			await (window.checkout ? window.checkout(payload) : (async () => { alert('checkout: ' + JSON.stringify(payload)); return { success: true }; })());
		});

		// Preselect paket pertama (jika ada)
		if (packs && packs[0]) selectPack(packs[0].id, packs, container);
	};

})();
