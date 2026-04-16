import HeroSection from '../components/home/HeroSection'
import FeaturesSection from '../components/home/FeaturesSection'
import WorkflowSection from '../components/home/WorkflowSection'
import CtaSection from '../components/home/CtaSection'

export default function HomePage() {
	return (
		<main id="top" className="relative overflow-hidden bg-[#f4f7f9] text-slate-900">
			<div
				aria-hidden
				className="pointer-events-none absolute inset-x-0 top-[-18rem] h-[32rem] bg-[radial-gradient(circle_at_20%_30%,rgba(20,184,166,0.24),transparent_46%),radial-gradient(circle_at_80%_20%,rgba(245,158,11,0.24),transparent_42%)]"
			/>
			<div
				aria-hidden
				className="animate-drift pointer-events-none absolute bottom-[-18rem] right-[-14rem] h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle,rgba(2,132,199,0.2)_0%,transparent_72%)] motion-reduce:animate-none"
			/>

			<div className="relative mx-auto flex w-full max-w-7xl flex-col gap-16 px-4 pb-16 pt-8 sm:px-6 lg:gap-24 lg:px-8 lg:pt-14">
				<HeroSection />
				<FeaturesSection />
				<WorkflowSection />
				<CtaSection />
			</div>
		</main>
	)
}
