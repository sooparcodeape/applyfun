import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export function NextScrapeCountdown() {
  const [timeUntilNextScrape, setTimeUntilNextScrape] = useState("");

  useEffect(() => {
    const calculateTimeUntilNextScrape = () => {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Scraper runs at 00:00, 04:00, 08:00, 12:00, 16:00, 20:00
      const scrapeHours = [0, 4, 8, 12, 16, 20];
      
      // Find next scrape hour
      let nextScrapeHour = scrapeHours.find(h => h > currentHour);
      if (!nextScrapeHour) {
        nextScrapeHour = scrapeHours[0]; // Next day
      }
      
      const nextScrape = new Date(now);
      if (nextScrapeHour < currentHour) {
        nextScrape.setDate(nextScrape.getDate() + 1);
      }
      nextScrape.setHours(nextScrapeHour, 0, 0, 0);
      
      const diff = nextScrape.getTime() - now.getTime();
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeUntilNextScrape(`${hours}h ${minutes}m`);
    };
    
    calculateTimeUntilNextScrape();
    const interval = setInterval(calculateTimeUntilNextScrape, 60000); // Update every minute
    
    return () => clearInterval(interval);
  }, []);

  if (!timeUntilNextScrape) return null;

  return (
    <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/30 rounded-full text-blue-300 text-sm">
      <Clock className="w-4 h-4" />
      <span>More jobs coming in... {timeUntilNextScrape}</span>
    </span>
  );
}
