import confetti from 'canvas-confetti';
import {
	FIRST_PURCHASE_CONFETTI_SELECTOR,
	FIRST_PURCHASE_STORAGE_KEY,
	playFirstPurchaseConfetti,
} from '@/utils/firstPurchaseConfetti';

const fire = vi.fn(() => null);
fire.reset = vi.fn();
const storage = new Map<string, string>();

vi.mock('canvas-confetti', () => ({
	default: Object.assign(vi.fn(), {
		create: vi.fn(() => fire),
	}),
}));

describe('playFirstPurchaseConfetti', () => {
	beforeEach(() => {
		vi.useFakeTimers();
		Object.defineProperty(window, 'localStorage', {
			configurable: true,
			value: {
				clear: () => storage.clear(),
				getItem: (key: string) => storage.get(key) ?? null,
				setItem: (key: string, value: string) => storage.set(key, value),
			},
		});
		vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
			window.setTimeout(() => callback(Date.now()), 16)
		);
		vi.stubGlobal('cancelAnimationFrame', (id: number) =>
			window.clearTimeout(id)
		);
		vi.stubGlobal(
			'matchMedia',
			vi.fn().mockReturnValue({ matches: false })
		);
		storage.clear();
		fire.mockClear();
		fire.reset.mockClear();
		vi.mocked(confetti.create).mockClear().mockImplementation(() => fire);
	});

	afterEach(() => {
		document.querySelector(FIRST_PURCHASE_CONFETTI_SELECTOR)?.remove();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	it('marks and celebrates only the first successful purchase, then cleans up', () => {
		playFirstPurchaseConfetti();

		expect(localStorage.getItem(FIRST_PURCHASE_STORAGE_KEY)).toBe('true');
		expect(document.querySelector(FIRST_PURCHASE_CONFETTI_SELECTOR)).toBeTruthy();

		playFirstPurchaseConfetti();
		expect(confetti.create).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(2_500);
		expect(document.querySelector(FIRST_PURCHASE_CONFETTI_SELECTOR)).toBeNull();
		expect(fire.reset).toHaveBeenCalledTimes(1);
	});

	it('marks the purchase without animating when reduced motion is preferred', () => {
		vi.mocked(window.matchMedia).mockReturnValue({
			matches: true,
		} as MediaQueryList);

		playFirstPurchaseConfetti();

		expect(localStorage.getItem(FIRST_PURCHASE_STORAGE_KEY)).toBe('true');
		expect(confetti.create).not.toHaveBeenCalled();
	});

	it('cleans up immediately when the caller unmounts', () => {
		const cleanup = playFirstPurchaseConfetti();
		cleanup();

		expect(document.querySelector(FIRST_PURCHASE_CONFETTI_SELECTOR)).toBeNull();
		expect(fire.reset).toHaveBeenCalledTimes(1);
	});

	it('keeps the successful purchase marked if the visual effect fails', () => {
		vi.mocked(confetti.create).mockImplementationOnce(() => {
			throw new Error('Canvas unavailable');
		});

		expect(() => playFirstPurchaseConfetti()).not.toThrow();
		expect(localStorage.getItem(FIRST_PURCHASE_STORAGE_KEY)).toBe('true');
		expect(document.querySelector(FIRST_PURCHASE_CONFETTI_SELECTOR)).toBeNull();
	});
});
