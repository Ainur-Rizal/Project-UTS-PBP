// Saya menyediakan util global untuk notifikasi (showToast) dan fungsi checkout demo.
// Saya menulis ini agar semua halaman topup bisa memanggil window.showToast dan window.checkout.
(function(){
	// pastikan ada container toast
	function ensureContainer(){
		let c = document.getElementById('globalToastContainer');
		if(!c){
			c = document.createElement('div');
			c.id = 'globalToastContainer';
			Object.assign(c.style, {
				position:'fixed',
				right:'16px',
				bottom:'16px',
				display:'flex',
				flexDirection:'column',
				gap:'8px',
				zIndex:99999,
				pointerEvents:'none'
			});
			document.body.appendChild(c);
		}
		return c;
	}

	// definisi showToast jika belum ada
	if(!window.showToast){
		window.showToast = function(message, type='info', timeout=3500){
			const container = ensureContainer();
			const t = document.createElement('div');
			t.className = 'ds-toast '+type;
			t.textContent = message;
			Object.assign(t.style, {
				pointerEvents:'auto',
				minWidth:'200px',
				padding:'10px 14px',
				borderRadius:'8px',
				boxShadow:'0 6px 18px rgba(2,6,23,0.12)',
				fontWeight:700,
				fontSize:'14px',
				opacity: '1',
				transition: 'opacity .28s'
			});
			// warna berdasarkan type sederhana
			if(type==='success') t.style.background = '#DCFCE7', t.style.color='#065F46';
			else if(type==='error') t.style.background = '#FEE2E2', t.style.color='#7F1D1D';
			else if(type==='warn') t.style.background = '#FFF7ED', t.style.color='#92400E';
			else t.style.background = '#E0F2FE', t.style.color = '#0369A1';

			container.appendChild(t);
			const remove = ()=> { t.style.opacity = '0'; setTimeout(()=> t.remove(), 300); };
			t.addEventListener('click', remove);
			setTimeout(remove, timeout);
			return t;
		};
	}

	// checkout util: panggil backend (mock jika 404) dan tampilkan hasil
	window.checkout = async function(payload){
		// tampilkan loading toast
		const loading = window.showToast ? window.showToast('Memproses pesanan...', 'info', 60000) : null;
		try{
			// panggil endpoint nyata (ganti URL sesuai backend), fallback ke mock jika gagal
			const res = await fetch('/api/checkout', {
				method:'POST',
				headers:{'Content-Type':'application/json'},
				body: JSON.stringify(payload)
			}).catch(()=>null);

			let data;
			if(!res || !res.ok){
				// mock response
				data = {
					success: true,
					invoice: 'TP' + Date.now(),
					message: 'Pesanan dibuat (demo). Silakan cek riwayat/transaksi.',
					paymentUrl: null
				};
			} else {
				data = await res.json();
			}

			if(loading) loading.remove?.();
			if(data.success){
				window.showToast(data.message || 'Checkout berhasil', 'success', 5000);
				// jika ada url pembayaran, arahkan
				if(data.paymentUrl){
					setTimeout(()=> window.location.href = data.paymentUrl, 900);
				}
				return data;
			} else {
				window.showToast(data.message || 'Checkout gagal', 'error', 6000);
				return data;
			}
		} catch(err){
			if(loading) loading.remove?.();
			window.showToast('Terjadi kesalahan jaringan', 'error', 6000);
			console.error('checkout error', err);
			return { success:false, error:err };
		}
	};
})();
