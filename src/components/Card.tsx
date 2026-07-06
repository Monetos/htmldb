import { forwardRef, type ElementType, type HTMLAttributes, type ReactNode } from 'react';
import { cardClassName, type CardElevation } from '../lib/cardStyles';

interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: ElementType;
  elevation?: CardElevation;
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

/**
 * Shared card surface, replacing the "rounded-2xl border ... bg-white
 * dark:border-slate-700 dark:bg-slate-800/40" string that used to be
 * hand-repeated across every feature. `as="section"` is used where a test
 * locates the card via `closest('section')`.
 */
export const Card = forwardRef<HTMLElement, CardProps>(function Card(
  { as: Component = 'div', elevation = 'flat', interactive = false, className = '', children, ...rest },
  ref,
) {
  return (
    <Component
      ref={ref}
      className={cardClassName({ elevation, interactive, className: `p-3 ${className}` })}
      {...rest}
    >
      {children}
    </Component>
  );
});
