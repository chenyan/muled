import { useEffect, useState, type RefObject } from 'react';

const DEFAULT_ROOT_MARGIN = '240px 0px';

/**
 * 代码块进入视口（含 margin）后再为 true，用于推迟 Mermaid/Math 等重渲染。
 */
export default function useCodeBlockInView(
  containerRef: RefObject<HTMLElement | null>,
  options?: { rootMargin?: string },
): boolean {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) {
      return undefined;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return undefined;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setInView(true);
        }
      },
      { root: null, rootMargin: options?.rootMargin ?? DEFAULT_ROOT_MARGIN },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [containerRef, options?.rootMargin]);

  return inView;
}
