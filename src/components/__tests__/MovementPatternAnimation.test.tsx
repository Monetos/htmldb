import { describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import { MovementPatternAnimation } from '../MovementPatternAnimation';
import { MOVEMENT_PATTERN_LABELS, type MovementPattern } from '../../db/schema';

const ALL_PATTERNS: MovementPattern[] = [
  'squat',
  'hinge',
  'horizontal_push',
  'horizontal_pull',
  'vertical_push',
  'vertical_pull',
  'lunge',
  'carry_core',
  'isolation',
];

describe('MovementPatternAnimation', () => {
  it('renders every pattern without throwing, with a matching aria-label', () => {
    for (const pattern of ALL_PATTERNS) {
      const { container, unmount } = render(<MovementPatternAnimation pattern={pattern} />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label', `Bewegungsmuster: ${MOVEMENT_PATTERN_LABELS[pattern]}`);
      unmount();
    }
  });

  it('applies the squat animation classes to the upper-body and legs groups', () => {
    const { container } = render(<MovementPatternAnimation pattern="squat" />);
    expect(container.querySelector('.animate-mp-squat-upper')).toBeInTheDocument();
    expect(container.querySelector('.animate-mp-squat-legs')).toBeInTheDocument();
  });

  it('applies the isolation animation class only to the right-arm segment', () => {
    const { container } = render(<MovementPatternAnimation pattern="isolation" />);
    const isolated = container.querySelector('.animate-mp-isolation-limb');
    expect(isolated).toBeInTheDocument();
    expect(isolated?.tagName.toLowerCase()).toBe('line');
    expect(container.querySelectorAll('[class*="animate-mp-"]')).toHaveLength(1);
  });
});
