// nFrame Studio — real generation bridge (OpenAI gpt-image + Kling video).
// Reuses the app's existing services so Generate really produces media when API
// keys are set; StudioApp falls back to the prototype's demo history otherwise.
import { generateImage, generateVideo, pollVideo, getProvider } from '../lib/aiAssist';
import { getKling, downscaleImage } from '../state/persistence';

const sizeFor = (aspect: string) => (aspect === '9:16' ? '1024x1536' : aspect === '16:9' ? '1536x1024' : '1024x1024');

// The worker only accepts embedded image data. Any slot value that is a URL
// (demo asset, library tile, remote) is fetched and converted to a data URL so
// the real Hero/Composition the user defined is actually sent to the model.
async function toDataUrl(src?: string | null): Promise<string | null> {
	if (!src) return null;
	if (src.startsWith('data:')) return src;
	try {
		const res = await fetch(src);
		const blob = await res.blob();
		return await new Promise<string | null>((resolve) => {
			const r = new FileReader();
			r.onload = () => resolve(r.result as string);
			r.onerror = () => resolve(null);
			r.readAsDataURL(blob);
		});
	} catch {
		return null;
	}
}

export interface ImageGenInput {
	prompt: string;
	hero?: string | null;
	comp?: string | null;
	aspect: string;
	batch: number;
}

// Returns generated image srcs (one per batch item). Throws when no OpenAI key.
export async function studioGenerateImage(input: ImageGenInput): Promise<string[]> {
	const prov = getProvider();
	if (prov.provider !== 'openai') throw new Error('OpenAI key required');
	const inputImages: { src: string; name: string }[] = [];
	const [heroData, compData] = await Promise.all([toDataUrl(input.hero), toDataUrl(input.comp)]);
	if (heroData) inputImages.push({ src: heroData, name: 'hero-subject' });
	if (compData) inputImages.push({ src: compData, name: 'composition-ref' });
	const size = sizeFor(input.aspect);
	const count = Math.max(1, Math.min(4, input.batch || 1));
	const settled = await Promise.allSettled(
		Array.from({ length: count }).map(() =>
			generateImage({ ...prov, prompt: input.prompt, size, quality: 'low', background: 'auto', outputFormat: 'png', inputImages }),
		),
	);
	const srcs = settled
		.filter((r): r is PromiseFulfilledResult<Record<string, unknown>> => r.status === 'fulfilled')
		.map((r) => {
			const v = r.value;
			return (v.image as string) || (v.images as { src: string }[] | undefined)?.[0]?.src || (v.url as string);
		})
		.filter(Boolean) as string[];
	if (!srcs.length) throw new Error('No images returned.');
	return srcs;
}

export interface VideoGenInput {
	prompt: string;
	startImage: string; // Start frame → Kling `image`
	endImage?: string | null; // End frame → Kling `image_tail`
	references?: string[]; // Reference images → Kling `image_list` (Elements mode)
	aspect: string;
	duration?: string; // seconds — Kling image-to-video supports '5' or '10'
	quality?: string; // 'std' | 'pro'
	model?: string; // kling model id (e.g. kling-v3, kling-v2-5-turbo)
}

// Returns the finished video URL. Throws when Kling keys are missing.
export async function studioGenerateVideo(input: VideoGenInput, onTick?: (s: string) => void): Promise<string> {
	const kling = getKling();
	if (!kling) throw new Error('Kling keys required');
	// Convert each frame to embedded data (Kling can't fetch app-relative demo
	// paths), then downscale to keep the request light.
	const prep = async (src?: string | null) => {
		if (!src) return '';
		const d = (await toDataUrl(src)) || src;
		return downscaleImage(d, 1024);
	};
	const refs = (input.references || []).slice(0, 4);
	const useRefs = refs.length > 0;
	const image = useRefs ? '' : await prep(input.startImage);
	const imageTail = !useRefs && input.endImage ? await prep(input.endImage) : undefined;
	const references = useRefs ? (await Promise.all(refs.map(prep))).filter(Boolean) : undefined;
	const taskId = await generateVideo({
		accessKey: kling.accessKey,
		secretKey: kling.secretKey,
		model: input.model || kling.model,
		image,
		imageTail,
		references,
		prompt: input.prompt,
		aspectRatio: input.aspect === 'auto' ? '16:9' : input.aspect,
		// Kling image-to-video renders 5s or 10s — map the chosen 3–15s to nearest.
		duration: (Number(input.duration) || 5) >= 8 ? '10' : '5',
		mode: input.quality === 'pro' ? 'pro' : 'std',
	});
	return pollVideo(kling, taskId, onTick);
}
