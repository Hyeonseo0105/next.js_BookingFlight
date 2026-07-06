import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { LogOut, Plane, User } from 'lucide-react';

import { AiPlannerFab } from '@/components/ai-planner-fab';
import { Button, buttonVariants } from '@/components/ui/button';
import { logout } from '@/app/actions/auth';
import { getCurrentUser } from '@/lib/auth';
import './globals.css';

export const metadata: Metadata = {
	title: 'Booking Flight',
	description: 'Search and book flights with ease.',
};

interface RootLayoutProps {
	children: ReactNode;
}

export default async function RootLayout({ children }: RootLayoutProps) {
	const user = await getCurrentUser();

	return (
		<html lang="en">
			<body>
				<header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
					<div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
						<Link
							className="flex items-center gap-2 text-sm font-semibold"
							href="/"
						>
							<Plane aria-hidden="true" className="size-4" />
							Booking Flights
						</Link>
						<nav className="flex items-center gap-1">
							<Link
								className={buttonVariants({ size: 'sm', variant: 'ghost' })}
								href="/search"
							>
								All Flights
							</Link>
							{user ? (
								<>
									<Link
										className={buttonVariants({
											className: 'max-w-[40vw] sm:max-w-none',
											size: 'sm',
											variant: 'ghost',
										})}
										href="/mypage"
									>
										<User aria-hidden="true" className="size-4 shrink-0" />
										<span className="hidden truncate sm:inline">
											{user.email}
										</span>
									</Link>
									<form action={logout}>
										<Button size="sm" type="submit" variant="ghost">
											<LogOut aria-hidden="true" className="size-4" />
											<span className="hidden sm:inline">Logout</span>
										</Button>
									</form>
								</>
							) : (
								<>
									<Link
										className={buttonVariants({ size: 'sm', variant: 'ghost' })}
										href="/login"
									>
										Login
									</Link>
									<Link
										className={buttonVariants({ size: 'sm', variant: 'default' })}
										href="/signup"
									>
										Sign up
									</Link>
								</>
							)}
						</nav>
					</div>
				</header>
				{children}
				<AiPlannerFab isLoggedIn={!!user} />
			</body>
		</html>
	);
}
