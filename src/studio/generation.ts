// nFrame Studio — real generation bridge (OpenAI gpt-image + Kling video).
// Reuses the app's existing services so Generate really produces media when API
// keys are set; StudioApp falls back to the prototype's demo history otherwise.
import { generateImage, generateVideo, pollVideo, getProvider } from '../lib/aiAssist';
import { getKling, downscaleImage } from '../state/persistence';

const sizeFor = (aspect: string) => (aspect === '9:16' ? '1024x1536' : aspect === '16:9' ? '1536x1024' : '1024x1024');

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
	// The API must be able to fetch every input image: data: URLs pass through,
	// app-relative demo paths (/studio/q/...) are made absolute against the origin.
	const abs = (s?: string | null) => (!s ? '' : s.startsWith('/') ? (typeof location !== 'undefined' ? location.origin : '') + s : s);
	const inputImages: { src: string; name: string }[] = [];
	const hero = abs(input.hero);
	const comp = abs(input.comp);
	if (hero) inputImages.push({ src: hero, name: 'hero-subject' });
	if (comp) inputImages.push({ src: comp, name: 'composition-ref' });
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
	startImage: string;
	aspect: string;
}

// Returns the finished video URL. Throws when Kling keys are missing.
export async function studioGenerateVideo(input: VideoGenInput, onTick?: (s: string) => void): Promise<string> {
	const kling = getKling();
	if (!kling) throw new Error('Kling keys required');
	const image = await downscaleImage(input.startImage, 1024);
	const taskId = await generateVideo({
		accessKey: kling.accessKey,
		secretKey: kling.secretKey,
		model: kling.model,
		image,
		prompt: input.prompt,
		aspectRatio: input.aspect === 'auto' ? '16:9' : input.aspect,
	});
	return pollVideo(kling, taskId, onTick);
}
