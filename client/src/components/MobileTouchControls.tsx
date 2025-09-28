import { useState, useRef, useEffect, ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SwipeGestureProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export function SwipeGesture({ 
  children, 
  onSwipeLeft, 
  onSwipeRight, 
  onSwipeUp, 
  onSwipeDown,
  className,
  disabled = false,
  threshold = 50
}: SwipeGestureProps) {
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const elementRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled) return;
    const touch = e.touches[0];
    setStartPos({ x: touch.clientX, y: touch.clientY });
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (disabled || !startPos) return;
    
    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - startPos.x;
    const deltaY = touch.clientY - startPos.y;
    
    // Determine if this is primarily a horizontal or vertical swipe
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      // Horizontal swipe
      if (Math.abs(deltaX) > threshold) {
        if (deltaX > 0) {
          onSwipeRight?.();
        } else {
          onSwipeLeft?.();
        }
      }
    } else {
      // Vertical swipe
      if (Math.abs(deltaY) > threshold) {
        if (deltaY > 0) {
          onSwipeDown?.();
        } else {
          onSwipeUp?.();
        }
      }
    }
    
    setStartPos(null);
  };

  const handleTouchCancel = () => {
    setStartPos(null);
  };

  return (
    <div
      ref={elementRef}
      className={cn('touch-pan-x touch-pan-y', className)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {children}
    </div>
  );
}

interface PullToRefreshProps {
  children: ReactNode;
  onRefresh: () => Promise<void> | void;
  className?: string;
  disabled?: boolean;
  threshold?: number;
}

export function PullToRefresh({ 
  children, 
  onRefresh, 
  className,
  disabled = false,
  threshold = 80
}: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [startY, setStartY] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (disabled || isRefreshing) return;
    
    // Only trigger if scrolled to top
    const container = containerRef.current;
    if (container && container.scrollTop === 0) {
      setStartY(e.touches[0].clientY);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || isRefreshing || startY === null) return;
    
    const currentY = e.touches[0].clientY;
    const distance = currentY - startY;
    
    if (distance > 0) {
      setPullDistance(Math.min(distance, threshold * 1.5));
      e.preventDefault(); // Prevent scrolling
    }
  };

  const handleTouchEnd = async () => {
    if (disabled || isRefreshing || startY === null) return;
    
    if (pullDistance >= threshold) {
      setIsRefreshing(true);
      try {
        await onRefresh();
      } finally {
        setIsRefreshing(false);
      }
    }
    
    setPullDistance(0);
    setStartY(null);
  };

  const refreshProgress = Math.min(pullDistance / threshold, 1);
  const shouldShowRefresh = pullDistance > 0 || isRefreshing;

  return (
    <div
      ref={containerRef}
      className={cn('relative overflow-auto', className)}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Pull to refresh indicator */}
      {shouldShowRefresh && (
        <div 
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center bg-background/80 backdrop-blur transition-transform duration-200"
          style={{ 
            transform: `translateY(${pullDistance - threshold}px)`,
            height: `${threshold}px`
          }}
        >
          <div className="flex items-center space-x-2">
            <div 
              className={cn(
                'w-6 h-6 rounded-full border-2 border-primary transition-transform duration-200',
                isRefreshing && 'animate-spin',
                refreshProgress >= 1 && !isRefreshing && 'rotate-180'
              )}
              style={{
                borderTopColor: 'transparent',
                transform: `rotate(${refreshProgress * 180}deg)`
              }}
            />
            <span className="text-sm font-medium">
              {isRefreshing ? 'Refreshing...' : pullDistance >= threshold ? 'Release to refresh' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}
      
      <div style={{ transform: `translateY(${pullDistance > 0 ? pullDistance : 0}px)` }}>
        {children}
      </div>
    </div>
  );
}

interface TouchFriendlyButtonProps {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  className?: string;
  disabled?: boolean;
  hapticFeedback?: boolean;
}

export function TouchFriendlyButton({
  children,
  onClick,
  variant = 'default',
  size = 'default',
  className,
  disabled = false,
  hapticFeedback = true
}: TouchFriendlyButtonProps) {
  const handleClick = () => {
    if (disabled) return;
    
    // Provide haptic feedback on supported devices
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
    
    onClick?.();
  };

  return (
    <Button
      variant={variant}
      size={size}
      className={cn(
        'touch-manipulation min-h-[44px] min-w-[44px]', // Ensure minimum touch target size
        className
      )}
      onClick={handleClick}
      disabled={disabled}
    >
      {children}
    </Button>
  );
}

interface ExpandableCardProps {
  children: ReactNode;
  title: string;
  preview?: ReactNode;
  className?: string;
  defaultExpanded?: boolean;
}

export function ExpandableCard({
  children,
  title,
  preview,
  className,
  defaultExpanded = false
}: ExpandableCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={cn('border rounded-lg overflow-hidden', className)}>
      <TouchFriendlyButton
        variant="ghost"
        className="w-full justify-between p-4 h-auto"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-1 text-left">
          <h3 className="font-medium">{title}</h3>
          {!isExpanded && preview && (
            <div className="mt-1 text-sm text-muted-foreground">
              {preview}
            </div>
          )}
        </div>
        <div className={cn(
          'transition-transform duration-200',
          isExpanded && 'rotate-180'
        )}>
          ▼
        </div>
      </TouchFriendlyButton>
      
      {isExpanded && (
        <div className="px-4 pb-4 border-t">
          {children}
        </div>
      )}
    </div>
  );
}

// Hook for detecting mobile device
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);
    
    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  return isMobile;
}

// Hook for detecting touch device
export function useIsTouch() {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
}