import {
	FunctionCallingConfigMode,
	GoogleGenAI,
	type Content,
	type FunctionDeclaration,
} from '@google/genai';

import { prisma } from '@/lib/prisma';

interface ChatMessage {
	role: 'user' | 'model';
	text: string;
}

const PROPOSE_FLIGHT_SEARCH: FunctionDeclaration = {
	name: 'propose_flight_search',
	description:
		'사용자와의 대화에서 항공권 검색 조건(목적지, 편도/왕복, 인원)이 충분히 확정되었을 때 호출합니다. ' +
		'from/to 값은 반드시 시스템 지침의 노선 목록에 있는 문자열을 정확히 그대로 사용해야 합니다.',
	parametersJsonSchema: {
		type: 'object',
		properties: {
			from: { type: 'string', description: '출발지. 시스템 지침 목록의 값 그대로 (기본값: "Seoul (ICN)")' },
			to: { type: 'string', description: '목적지. 시스템 지침 목록의 값 그대로' },
			tripType: { type: 'string', enum: ['ONE_WAY', 'ROUND_TRIP'] },
			travelers: { type: 'number', description: '여행 인원 수 (기본값 1)' },
			reason: { type: 'string', description: '이 목적지를 추천하는 이유, 한국어 한 문장' },
		},
		required: ['to', 'tripType'],
	},
};

export async function POST(request: Request) {
	const apiKey = process.env.GEMINI_API_KEY;
	if (!apiKey) {
		return Response.json(
			{ error: 'GEMINI_API_KEY가 설정되지 않았습니다. .env 파일에 키를 추가한 뒤 서버를 재시작해주세요.' },
			{ status: 500 },
		);
	}

	let messages: ChatMessage[];
	try {
		const body = await request.json();
		messages = body.messages;
	} catch {
		return Response.json({ error: '잘못된 요청 형식입니다.' }, { status: 400 });
	}
	if (!Array.isArray(messages) || messages.length === 0) {
		return Response.json({ error: 'messages가 필요합니다.' }, { status: 400 });
	}

	const routeLines = await buildRouteLines();
	const systemInstruction = buildSystemInstruction(routeLines);

	const ai = new GoogleGenAI({ apiKey });
	const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
	const contents: Content[] = messages.map(m => ({
		role: m.role,
		parts: [{ text: m.text }],
	}));

	const encoder = new TextEncoder();

	const stream = new ReadableStream({
		async start(controller) {
			function send(obj: unknown) {
				controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'));
			}

			try {
				const responseStream = await ai.models.generateContentStream({
					model,
					contents,
					config: {
						systemInstruction,
						tools: [{ functionDeclarations: [PROPOSE_FLIGHT_SEARCH] }],
						toolConfig: {
							functionCallingConfig: { mode: FunctionCallingConfigMode.AUTO },
						},
					},
				});

				for await (const chunk of responseStream) {
					if (chunk.text) {
						send({ type: 'text', value: chunk.text });
					}
					if (chunk.functionCalls?.length) {
						for (const call of chunk.functionCalls) {
							send({ type: 'function_call', name: call.name, args: call.args });
						}
					}
				}
			} catch (err) {
				send({
					type: 'error',
					message: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
				});
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: { 'Content-Type': 'application/x-ndjson; charset=utf-8' },
	});
}

// ─── Route context (그라운딩용, DB 실제 데이터만 사용) ─────────────────────────

async function buildRouteLines(): Promise<string> {
	const flights = await prisma.flight.findMany({
		select: { from: true, to: true, toKr: true, price: true },
	});

	const byRoute = new Map<string, { from: string; to: string; toKr: string; minPrice: number }>();
	for (const f of flights) {
		const key = `${f.from}→${f.to}`;
		const existing = byRoute.get(key);
		if (!existing || f.price < existing.minPrice) {
			byRoute.set(key, { from: f.from, to: f.to, toKr: f.toKr, minPrice: f.price });
		}
	}

	return [...byRoute.values()]
		.sort((a, b) => a.minPrice - b.minPrice)
		.map(r => `- ${r.from} → ${r.to} (${r.toKr || r.to}) · 최저가 $${r.minPrice}`)
		.join('\n');
}

function buildSystemInstruction(routeLines: string): string {
	return `당신은 항공권 예약 앱 "booking-flight"의 AI 여행 플래너입니다.
사용자와 대화하며 예산, 여행 스타일, 기간, 인원 등을 파악해 아래 실제 판매 중인 노선 중에서 가장 알맞은 목적지를 추천하세요.

# 판매 중인 노선 (출발지 → 목적지 · 최저가)
${routeLines}

# 규칙
- 반드시 위 목록에 있는 목적지만 추천하세요. 목록에 없는 도시를 언급하거나 지어내지 마세요.
- 대화는 한국어로, 친근하고 간결하게 하세요 (2~3문장 이내).
- 예산/스타일/인원 등 필요한 정보가 부족하면 한 번에 한 가지씩 되물으세요.
- 충분한 정보가 모여 추천할 목적지가 명확해지면, 먼저 텍스트로 추천 이유를 설명한 뒤 반드시 propose_flight_search 함수를 호출하세요.
- propose_flight_search의 from/to 값은 위 목록에 있는 문자열을 정확히 그대로(괄호와 공백 포함) 사용하세요.`;
}
