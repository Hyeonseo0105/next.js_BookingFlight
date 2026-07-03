import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from '@/components/ui/card';
import { FlightSearchForm } from '@/components/flight-search-form';

export default function Page() {
	return (
		<main className="flex h-[calc(100vh-3.5rem-1px)] flex-col overflow-y-auto bg-muted/30 px-4 py-4 text-foreground sm:px-6 sm:py-6 lg:px-8">
			<section className="mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center gap-4">
				<div className="mx-auto flex w-full max-w-4xl flex-col gap-2 text-center sm:text-left">
					<p className="text-sm font-medium text-muted-foreground">
						Flight search
					</p>
					<div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
						<div className="space-y-1">
							<h1 className="text-2xl font-semibold tracking-normal sm:text-3xl">
								Find your next flight
							</h1>
							<p className="max-w-2xl text-sm leading-6 text-muted-foreground">
								Search routes, dates, and travelers from one clean booking form.
							</p>
						</div>
					</div>
				</div>

				<Card className="overflow-hidden">
					<CardHeader className="border-b bg-background p-4 sm:p-5">
						<CardTitle>Search flights</CardTitle>
						<CardDescription>
							Enter your trip details to start comparing available flights.
						</CardDescription>
					</CardHeader>
					<CardContent className="bg-card p-4 sm:p-5">
						<FlightSearchForm />
					</CardContent>
				</Card>
			</section>
		</main>
	);
}
