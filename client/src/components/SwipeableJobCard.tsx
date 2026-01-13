import { ReactNode, useRef, useState } from "react";
import { useHaptic } from "@/hooks/useHaptic";
import { Bookmark, Zap, X } from "lucide-react";

interface SwipeableJobCardProps {
  children: ReactNode;
  onSave?: () => void;
  onApply?: () => void;
  onDismiss?: () => void;
}

export function SwipeableJobCard({
  children,
  onSave,
  onApply,
  onDismiss,
}: SwipeableJobCardProps) {
  const [offset, setOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);
  const { triggerHaptic } = useHaptic();
  const actionTriggered = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
    actionTriggered.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    setOffset(diff);

    // Trigger haptic at action thresholds
    if (!actionTriggered.current) {
      if (Math.abs(diff) > 100) {
        triggerHaptic("medium");
        actionTriggered.current = true;
      }
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    
    // Trigger actions based on swipe distance
    if (offset > 100 && onSave) {
      triggerHaptic("heavy");
      onSave();
    } else if (offset < -100 && onApply) {
      triggerHaptic("heavy");
      onApply();
    }
    
    // Reset position
    setOffset(0);
  };

  const getBackgroundColor = () => {
    if (offset > 100) return "bg-green-500/20";
    if (offset < -100) return "bg-blue-500/20";
    return "bg-transparent";
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Left action (Save) */}
      {offset > 0 && (
        <div className="absolute left-0 top-0 bottom-0 flex items-center px-6 bg-green-500/30">
          <Bookmark className="w-6 h-6 text-green-400" />
        </div>
      )}
      
      {/* Right action (Apply) */}
      {offset < 0 && (
        <div className="absolute right-0 top-0 bottom-0 flex items-center px-6 bg-blue-500/30">
          <Zap className="w-6 h-6 text-blue-400" />
        </div>
      )}

      {/* Card content */}
      <div
        className={`relative transition-all duration-200 ${getBackgroundColor()}`}
        style={{
          transform: `translateX(${offset}px)`,
          transition: isDragging ? "none" : "transform 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
    </div>
  );
}
