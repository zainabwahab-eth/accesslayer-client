import confetti from 'canvas-confetti';

export const FIRST_PURCHASE_STORAGE_KEY = 'has_bought';
export const FIRST_PURCHASE_CONFETTI_SELECTOR =
	'canvas[data-first-purchase-confetti="true"]';

const CELEBRATION_DURATION_MS = 2_500;
const NOOP = () => {};

/**
 * Marks the first successful purchase and plays its non-blocking celebration.
 * The returned function is safe to call repeatedly and should be called when
 * the owning view unmounts.
 */
export function playFirstPurchaseConfetti(): () => void {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		return NOOP;
	}

	try {
		if (window.localStorage.getItem(FIRST_PURCHASE_STORAGE_KEY) === 'true') {
			return NOOP;
		}
		window.localStorage.setItem(FIRST_PURCHASE_STORAGE_KEY, 'true');
	} catch {
		// If storage is unavailable, do not risk celebrating more than once.
		return NOOP;
	}

	if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
		return NOOP;
	}

	const canvas = document.createElement('canvas');
	canvas.dataset.firstPurchaseConfetti = 'true';
	Object.assign(canvas.style, {
		position: 'fixed',
		inset: '0',
		width: '100%',
		height: '100%',
		pointerEvents: 'none',
		zIndex: '2147483647',
	});
	document.body.appendChild(canvas);

	let animationFrameId: number | null = null;
	let safetyTimerId: number | null = null;
	let isCleanedUp = false;
	let fire: ReturnType<typeof confetti.create> | null = null;

	const cleanup = () => {
		if (isCleanedUp) return;
		isCleanedUp = true;
		if (animationFrameId !== null) {
			window.cancelAnimationFrame(animationFrameId);
		}
		if (safetyTimerId !== null) {
			window.clearTimeout(safetyTimerId);
		}
		fire?.reset();
		canvas.remove();
	};

	try {
		fire = confetti.create(canvas, { resize: true });
		const endAt = Date.now() + CELEBRATION_DURATION_MS;
		const colors = ['#fbbf24', '#fb7185', '#34d399', '#60a5fa', '#f8fafc'];

		const animate = () => {
			if (Date.now() >= endAt) {
				cleanup();
				return;
			}

			const result = fire?.({
				particleCount: 5,
				angle: 60 + Math.random() * 60,
				spread: 70,
				startVelocity: 32,
				gravity: 0.9,
				ticks: 150,
				colors,
				origin: { x: Math.random(), y: 0.15 + Math.random() * 0.35 },
			});
			if (result) void result.catch(cleanup);
			animationFrameId = window.requestAnimationFrame(animate);
		};

		animationFrameId = window.requestAnimationFrame(animate);
		// Guarantees removal even if animation frames are throttled or suspended.
		safetyTimerId = window.setTimeout(cleanup, CELEBRATION_DURATION_MS);
	} catch {
		cleanup();
	}

	return cleanup;
}
