import { useState, useEffect } from 'react';
import { navigationCategories } from '@/config/navigationConfig';

interface UseNavigationStateOptions {
  mode?: 'desktop' | 'mobile';
  persistKey?: string;
  defaultExpanded?: boolean;
}

export function useNavigationState({
  mode = 'desktop',
  persistKey = mode === 'desktop' ? 'arus-desktop-collapsed-groups' : 'arus-mobile-collapsed-groups',
  defaultExpanded = true,
}: UseNavigationStateOptions = {}) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(() => {
    if (typeof window === 'undefined') {
      return defaultExpanded 
        ? new Set(navigationCategories.map(cat => cat.name))
        : new Set();
    }

    const saved = localStorage.getItem(persistKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return new Set(parsed);
      } catch (e) {
        console.error(`Failed to parse ${persistKey}`, e);
      }
    }

    return defaultExpanded 
      ? new Set(navigationCategories.map(cat => cat.name))
      : new Set();
  });

  useEffect(() => {
    localStorage.setItem(persistKey, JSON.stringify([...expandedCategories]));
  }, [expandedCategories, persistKey]);

  const toggleCategory = (categoryName: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(categoryName)) {
        next.delete(categoryName);
      } else {
        next.add(categoryName);
      }
      return next;
    });
  };

  const isExpanded = (categoryName: string): boolean => {
    return expandedCategories.has(categoryName);
  };

  const expandAll = () => {
    setExpandedCategories(new Set(navigationCategories.map(cat => cat.name)));
  };

  const collapseAll = () => {
    setExpandedCategories(new Set());
  };

  return {
    expandedCategories,
    toggleCategory,
    isExpanded,
    expandAll,
    collapseAll,
  };
}
