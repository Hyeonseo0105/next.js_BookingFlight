import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

import { decrypt } from '@/lib/session';

const protectedRoutes = ['/mypage', '/reservation'];
const authRoutes = ['/login', '/signup'];

function matchesRoute(path: string, routes: string[]): boolean {
	return routes.some(route => path === route || path.startsWith(`${route}/`));
}

export default async function proxy(request: NextRequest) {
	const path = request.nextUrl.pathname;
	const isProtectedRoute = matchesRoute(path, protectedRoutes);
	const isAuthRoute = matchesRoute(path, authRoutes);

	const session = await decrypt(request.cookies.get('session')?.value);

	if (isProtectedRoute && !session) {
		const from = `${request.nextUrl.pathname}${request.nextUrl.search}`;
		const loginUrl = new URL('/login', request.url);
		loginUrl.searchParams.set('from', from);
		return NextResponse.redirect(loginUrl);
	}

	if (isAuthRoute && session) {
		return NextResponse.redirect(new URL('/mypage', request.url));
	}

	return NextResponse.next();
}

export const config = {
	matcher: ['/((?!api|_next/static|_next/image|.*\\.png$|.*\\.svg$|.*\\.ico$).*)'],
};
