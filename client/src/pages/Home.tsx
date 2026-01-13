import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Rocket, Zap, Shield, TrendingUp, ArrowRight } from "lucide-react";
// import { getLoginUrl } from "@/const"; // Removed Manus OAuth
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { NextScrapeCountdown } from "@/components/NextScrapeCountdown";

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { data: jobStats } = trpc.jobs.stats.useQuery();

  const handleGetStarted = () => {
    if (isAuthenticated) {
      setLocation("/dashboard");
    } else {
      setLocation("/jobs");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      {/* Header */}
      <header className="border-b border-purple-500/20 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <img src="/logo-icon.png" alt="apply.fun" className="h-10 w-10" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              apply.fun
            </span>
          </div>
          <Button onClick={handleGetStarted} variant="outline" className="border-purple-500/50 hover:bg-purple-500/10">
            {isAuthenticated ? "Dashboard" : "Get Started"}
          </Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-block px-4 py-2 bg-purple-500/10 border border-purple-500/30 rounded-full text-purple-300 text-sm mb-4">
            🚀 Powered by Token Burns & Crypto Credits
          </div>
          
          <h1 className="text-5xl md:text-7xl font-bold leading-tight">
            Land Your Dream{" "}
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-purple-400 bg-clip-text text-transparent">
              Crypto Job
            </span>
            {" "}Faster
          </h1>
          
          <p className="text-xl text-slate-300 max-w-2xl mx-auto">
            Stop wasting hours on job applications. apply.fun automatically applies
            to hundreds of Web3 jobs while you focus on what matters - building your
            career. Burn tokens for credits, target your dream companies, and let automation do the rest.</p>
          
          {jobStats && jobStats.active > 0 && (
            <div className="flex flex-col items-center gap-3">
              <div className="inline-flex items-center gap-2 px-6 py-3 bg-purple-500/20 border border-purple-500/30 rounded-full text-lg font-semibold">
                <span className="text-4xl font-bold text-purple-300">{jobStats?.total || 0}</span>
                <span className="text-purple-200">active crypto jobs ready to apply</span>
              </div>
              <NextScrapeCountdown />
            </div>
          )}
          
          <div className="flex gap-4 justify-center pt-4">
            <Button 
              onClick={handleGetStarted} 
              size="lg" 
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8"
            >
              {jobStats && jobStats.active > 0 
                ? `Apply to ${jobStats.active.toLocaleString()}+ Jobs Now` 
                : "Start Applying"}
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 mt-24 max-w-6xl mx-auto">
          <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-colors">
            <Zap className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Smart Automation</h3>
            <p className="text-slate-400">
              AI-powered form filling that adapts to any job application platform
            </p>
          </div>
          
          <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-colors">
            <Shield className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Review & Approve</h3>
            <p className="text-slate-400">
              You stay in control - review and approve jobs before we apply
            </p>
          </div>
          
          <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-colors">
            <TrendingUp className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">Track Progress</h3>
            <p className="text-slate-400">
              Monitor all applications with detailed analytics and response rates
            </p>
          </div>
          
          <div className="bg-slate-900/50 border border-purple-500/20 rounded-lg p-6 hover:border-purple-500/40 transition-colors">
            <Rocket className="h-12 w-12 text-purple-400 mb-4" />
            <h3 className="text-xl font-semibold mb-2 text-white">5 Job Sources</h3>
            <p className="text-slate-400">
              Access jobs from web3.career, CryptoJobsList, Remote3, Solana Jobs, and Telegram
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-2xl p-12 text-center">
            <h2 className="text-3xl font-bold mb-4 text-white">Ready to 10x Your Job Search?</h2>
            <p className="text-slate-300 mb-8">
              Join crypto professionals who are landing interviews faster with automated applications
            </p>
            <Button 
              onClick={handleGetStarted}
              size="lg"
              className="bg-white text-purple-900 hover:bg-slate-100 px-8"
            >
              Get Started Free
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-purple-500/20 mt-24 py-8">
        <div className="container mx-auto px-4 text-center text-slate-400">
          <p>© 2026 CryptoApply. Automate your Web3 job search.</p>
        </div>
      </footer>
    </div>
  );
}
