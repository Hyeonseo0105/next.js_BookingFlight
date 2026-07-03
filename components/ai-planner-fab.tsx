'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Bot, BookmarkCheck, BookmarkPlus, Loader, Send, Sparkles, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { savePlannerSummary } from '@/app/actions/planner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatTurn {
	role: 'user' | 'model';
	text: string;
}

interface ProposedSearch {
	from: string;
	to: string;
	tripType: 'ONE_WAY' | 'ROUND_TRIP';
	travelers: number;
	reason?: string;
	href: string;
}

type PlannerEvent =
	| { type: 'text'; value: string }
	| { type: 'function_call'; name: string; args?: Record<string, unknown> }
	| { type: 'error'; message: string };

const SUGGESTIONS = [
	'저렴한 동남아 여행지 추천해줘',
	'2주 뒤 가족 여행 갈만한 곳 있을까?',
	'혼자 힐링하러 갈 만한 곳 추천해줘',
];

// ─── Main component ───────────────────────────────────────────────────────────

interface AiPlannerFabProps {
	isLoggedIn: boolean;
}

export function AiPlannerFab({ isLoggedIn }: AiPlannerFabProps) {
	const router = useRouter();
	const [open, setOpen] = useState(false);
	const [messages, setMessages] = useState<ChatTurn[]>([]);
	const [streamingText, setStreamingText] = useState('');
	const [loading, setLoading] = useState(false);
	const [errorMsg, setErrorMsg] = useState<string | null>(null);
	const [proposedSearch, setProposedSearch] = useState<ProposedSearch | null>(null);
	const [input, setInput] = useState('');
	const [saved, setSaved] = useState(false);
	const [saveError, setSaveError] = useState<string | null>(null);
	const [isSaving, startSaveTransition] = useTransition();
	const scrollRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
	}, [messages, streamingText, proposedSearch]);

	function handleClose() {
		setOpen(false);
		setTimeout(() => {
			setMessages([]);
			setStreamingText('');
			setLoading(false);
			setErrorMsg(null);
			setProposedSearch(null);
			setInput('');
			setSaved(false);
			setSaveError(null);
		}, 200);
	}

	async function sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed || loading) return;

		const history: ChatTurn[] = [...messages, { role: 'user', text: trimmed }];
		setMessages(history);
		setInput('');
		setLoading(true);
		setErrorMsg(null);
		setProposedSearch(null);
		setStreamingText('');
		setSaved(false);
		setSaveError(null);

		let acc = '';

		try {
			const res = await fetch('/api/planner', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ messages: history }),
			});

			if (!res.ok || !res.body) {
				const data = await res.json().catch(() => null);
				throw new Error(data?.error ?? 'AI 플래너 요청에 실패했습니다.');
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let buffer = '';

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;
				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split('\n');
				buffer = lines.pop() ?? '';

				for (const line of lines) {
					if (!line.trim()) continue;
					const event = JSON.parse(line) as PlannerEvent;

					if (event.type === 'text') {
						acc += event.value;
						setStreamingText(acc);
					} else if (event.type === 'function_call' && event.name === 'propose_flight_search') {
						const proposal = parseProposal(event.args);
						if (proposal) setProposedSearch(proposal);
					} else if (event.type === 'error') {
						throw new Error(event.message);
					}
				}
			}
		} catch (err) {
			setErrorMsg(err instanceof Error ? err.message : 'AI 플래너에서 오류가 발생했습니다.');
		} finally {
			if (acc.trim()) {
				setMessages(prev => [...prev, { role: 'model', text: acc }]);
			}
			setStreamingText('');
			setLoading(false);
		}
	}

	function handleViewFlights() {
		if (!proposedSearch) return;
		handleClose();
		router.push(proposedSearch.href);
	}

	function handleSaveSummary() {
		if (!proposedSearch) return;
		const summary = proposedSearch.reason ?? `${proposedSearch.to} 여행 추천`;
		setSaveError(null);
		startSaveTransition(async () => {
			const result = await savePlannerSummary(proposedSearch.to, summary);
			if (result.error) {
				setSaveError(result.error);
			} else {
				setSaved(true);
			}
		});
	}

	return (
		<>
			{/* ── FAB ─────────────────────────────────────────────────────────── */}
			<button
				aria-label="AI Planner 열기"
				type="button"
				onClick={() => setOpen(true)}
				className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-all duration-200 hover:scale-110 hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
			>
				<Bot className="size-6" aria-hidden="true" />
			</button>

			{/* ── Backdrop ─────────────────────────────────────────────────────── */}
			{open && (
				<div
					aria-hidden="true"
					className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
					onClick={handleClose}
				/>
			)}

			{/* ── Popup ────────────────────────────────────────────────────────── */}
			{open && (
				<div
					role="dialog"
					aria-modal="true"
					aria-label="AI Planner"
					className="fixed inset-x-4 top-1/2 z-50 mx-auto flex h-[80svh] max-h-[640px] max-w-md -translate-y-1/2 flex-col overflow-hidden rounded-2xl bg-background shadow-2xl"
				>
					{/* Header */}
					<div className="flex shrink-0 items-center justify-between border-b px-6 py-4">
						<div className="flex items-center gap-2">
							<Sparkles className="size-5 text-primary" aria-hidden="true" />
							<span className="font-semibold">AI Planner</span>
						</div>
						<button
							aria-label="닫기"
							type="button"
							onClick={handleClose}
							className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
						>
							<X className="size-4" aria-hidden="true" />
						</button>
					</div>

					{/* Message list */}
					<div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
						{messages.length === 0 && !streamingText && (
							<>
								<ChatBubble
									role="model"
									text="안녕하세요! 예산, 여행 스타일, 인원 등을 알려주시면 딱 맞는 항공권을 찾아드릴게요. 어떤 여행을 계획 중이신가요?"
								/>
								<div className="flex flex-col gap-2 pt-1">
									{SUGGESTIONS.map(s => (
										<button
											key={s}
											type="button"
											onClick={() => sendMessage(s)}
											className="w-fit rounded-full border border-border px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:bg-muted/50 hover:text-foreground"
										>
											{s}
										</button>
									))}
								</div>
							</>
						)}

						{messages.map((m, i) => (
							<ChatBubble key={i} role={m.role} text={m.text} />
						))}

						{streamingText && <ChatBubble role="model" text={streamingText} />}

						{loading && !streamingText && (
							<div className="flex items-center gap-2 text-xs text-muted-foreground">
								<Loader className="size-3.5 animate-spin" aria-hidden="true" />
								생각하는 중...
							</div>
						)}

						{errorMsg && (
							<div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">
								<AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
								{errorMsg}
							</div>
						)}

						{proposedSearch && (
							<div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
								<p className="text-xs font-medium text-muted-foreground">AI 추천 노선</p>
								<p className="mt-1 text-sm font-semibold">
									{proposedSearch.from} → {proposedSearch.to}
								</p>
								{proposedSearch.reason && (
									<p className="mt-1 text-xs text-muted-foreground">{proposedSearch.reason}</p>
								)}
								<Button className="mt-3 w-full" size="sm" onClick={handleViewFlights}>
									이 조건으로 검색하기
								</Button>

								{isLoggedIn ? (
									<Button
										className="mt-2 w-full"
										disabled={isSaving || saved}
										onClick={handleSaveSummary}
										size="sm"
										variant="outline"
									>
										{saved ? (
											<>
												<BookmarkCheck aria-hidden="true" className="size-4" />
												대화 요약 저장됨
											</>
										) : (
											<>
												<BookmarkPlus aria-hidden="true" className="size-4" />
												{isSaving ? '저장 중...' : '대화 요약 저장'}
											</>
										)}
									</Button>
								) : (
									<a
										className="mt-2 flex w-full items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
										href="/login"
									>
										<BookmarkPlus aria-hidden="true" className="size-4" />
										로그인 후 대화 저장
									</a>
								)}
								{saveError && <p className="mt-1.5 text-xs text-destructive">{saveError}</p>}
							</div>
						)}
					</div>

					{/* Input */}
					<form
						className="flex shrink-0 items-center gap-2 border-t px-4 py-3"
						onSubmit={e => {
							e.preventDefault();
							sendMessage(input);
						}}
					>
						<Input
							disabled={loading}
							onChange={e => setInput(e.target.value)}
							placeholder="메시지를 입력하세요..."
							value={input}
						/>
						<Button
							aria-label="전송"
							disabled={loading || !input.trim()}
							size="icon"
							type="submit"
						>
							<Send className="size-4" aria-hidden="true" />
						</Button>
					</form>
				</div>
			)}
		</>
	);
}

// ─── Chat bubble ────────────────────────────────────────────────────────────

function ChatBubble({ role, text }: { role: 'user' | 'model'; text: string }) {
	const isUser = role === 'user';
	return (
		<div className={cn('flex', isUser ? 'justify-end' : 'justify-start')}>
			<div
				className={cn(
					'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
					isUser
						? 'rounded-br-sm bg-primary text-primary-foreground'
						: 'rounded-bl-sm bg-muted text-foreground',
				)}
			>
				{text}
			</div>
		</div>
	);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseProposal(args: Record<string, unknown> | undefined): ProposedSearch | null {
	if (!args) return null;
	const to = typeof args.to === 'string' ? args.to.trim() : '';
	if (!to) return null;

	const from = typeof args.from === 'string' && args.from.trim() ? args.from.trim() : 'Seoul (ICN)';
	const tripType = args.tripType === 'ROUND_TRIP' ? 'ROUND_TRIP' : 'ONE_WAY';
	const travelers = typeof args.travelers === 'number' && args.travelers > 0 ? Math.floor(args.travelers) : 1;
	const reason = typeof args.reason === 'string' ? args.reason : undefined;

	const params = new URLSearchParams({ from, to, tripType, travelers: String(travelers) });

	return { from, to, tripType, travelers, reason, href: `/search?${params.toString()}` };
}
