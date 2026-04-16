import HeroSection from '../components/home/HeroSection'
import StatsSection from '../components/home/StatsSection'
import FeaturesSection from '../components/home/FeaturesSection'
import WorkflowSection from '../components/home/WorkflowSection'
import CtaSection from '../components/home/CtaSection'

export default function HomePage() {
	return (
		<main id="top" className="bg-[radial-gradient(circle_at_top,rgba(251,191,36,0.18),transparent_28%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] px-4 py-6 text-slate-900 sm:px-6 lg:px-8 lg:py-8">
			<div className="mx-auto flex w-full max-w-7xl flex-col gap-6 lg:gap-8">
				<HeroSection />
				<StatsSection />
				<FeaturesSection />
				<WorkflowSection />
				<CtaSection />
			</div>
		</main>
	)
}
