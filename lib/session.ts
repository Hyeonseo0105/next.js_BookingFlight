import 'server-only';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

const SESSION_COOKIE = 'session';
const SESSION_DURATION_MS = 7 * 24 * 60 * 60 * 1000;

const secretKey = process.env.SESSION_SECRET;
if (!secretKey) throw new Error('SESSION_SECRET environment variable is not set');
const encodedKey = new TextEncoder().encode(secretKey);

export interface SessionPayload {
	[key: string]: unknown;
	userId: string;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
	return new SignJWT(payload)
		.setProtectedHeader({ alg: 'HS256' })
		.setIssuedAt()
		.setExpirationTime('7d')
		.sign(encodedKey);
}

export async function decrypt(token?: string): Promise<SessionPayload | null> {
	if (!token) return null;
	try {
		const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
		if (typeof payload.userId !== 'string') return null;
		return { userId: payload.userId };
	} catch {
		return null;
	}
}

export async function createSession(userId: string): Promise<void> {
	const session = await encrypt({ userId });
	const expires = new Date(Date.now() + SESSION_DURATION_MS);
	const cookieStore = await cookies();
	cookieStore.set(SESSION_COOKIE, session, {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production',
		sameSite: 'lax',
		expires,
		path: '/',
	});
}

export async function deleteSession(): Promise<void> {
	const cookieStore = await cookies();
	cookieStore.delete(SESSION_COOKIE);
}
