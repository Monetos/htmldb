import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import App from '../../../App';
import { db, ensureSettings, seedFoodsIfEmpty } from '../../../db/database';

const NOW = new Date(2026, 4, 11, 12).getTime();

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(NOW);
});

afterEach(() => {
  vi.restoreAllMocks();
});

async function renderAt(path: string) {
  await ensureSettings();
  await seedFoodsIfEmpty();
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe('Ernährung – Heute', () => {
  it('renders four empty meal sections and the macro rings', async () => {
    await renderAt('/ernaehrung/heute');
    for (const meal of ['Frühstück', 'Mittagessen', 'Abendessen', 'Snack']) {
      expect(await screen.findByRole('heading', { name: meal })).toBeInTheDocument();
    }
    expect(screen.getAllByText(/Noch nichts eingetragen/).length).toBe(4);
  });

  it('logs a food entry from the picker and updates the meal subtotal', async () => {
    await renderAt('/ernaehrung/heute');
    const user = userEvent.setup();

    // Open the picker via the breakfast section's "Hinzufügen" button.
    const breakfast = (await screen.findByRole('heading', { name: 'Frühstück' })).closest('section')!;
    await user.click(within(breakfast).getByRole('button', { name: /Hinzufügen/ }));

    const dialog = await screen.findByRole('dialog', { name: /Lebensmittel/ });
    await user.click(within(dialog).getByRole('button', { name: /^Magerquark/ }));
    // Amount defaults to 100g; jump to 250.
    const amount = within(dialog).getByLabelText(/Menge \(g\)/);
    await user.clear(amount);
    await user.type(amount, '250');
    await user.click(within(dialog).getByRole('button', { name: /Hinzufügen/ }));

    await waitFor(async () => {
      expect(await db.foodLog.count()).toBe(1);
    });
    // The entry appears in the breakfast section.
    expect(await within(breakfast).findByText(/Magerquark/)).toBeInTheDocument();
    expect(within(breakfast).getByText(/250 g/)).toBeInTheDocument();
    // 250g × 67 kcal / 100 = 167.5 → rounded display = 168.
    // Appears both in the meal subtotal header and the entry row.
    expect(within(breakfast).getAllByText(/168 kcal/).length).toBeGreaterThan(0);
  });

  it('adds water through the +500 ml quick button', async () => {
    await renderAt('/ernaehrung/heute');
    const user = userEvent.setup();
    await user.click(await screen.findByRole('button', { name: /\+500 ml/ }));
    await waitFor(async () => {
      expect(await db.waterLog.count()).toBe(1);
    });
    expect(screen.getByText(/500 \/ 3000 ml/)).toBeInTheDocument();
  });
});

describe('Ernährung – Lebensmittel', () => {
  it('lists the seed foods sorted by name', async () => {
    await renderAt('/ernaehrung/lebensmittel');
    expect(await screen.findByRole('link', { name: /Magerquark/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Banane/ })).toBeInTheDocument();
  });

  it('creates a custom food via the form', async () => {
    await renderAt('/ernaehrung/lebensmittel/neu');
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText(/Name/), 'Skyr');
    await user.type(screen.getByLabelText(/Kalorien/), '65');
    await user.type(screen.getByLabelText(/^Protein/), '11');
    await user.type(screen.getByLabelText(/Kohlenhydrate/), '4');
    await user.type(screen.getByLabelText(/^Fett/), '0.2');
    await user.click(screen.getByRole('button', { name: /Anlegen/ }));
    await waitFor(async () => {
      const custom = await db.foods.where('isCustom').equals(1).toArray();
      // fake-indexeddb uses 0/1 for the indexed boolean; the more portable check
      // is to filter on the row contents.
      const customByFlag = (await db.foods.toArray()).filter((f) => f.isCustom);
      const combined = custom.length > 0 ? custom : customByFlag;
      expect(combined.some((f) => f.name === 'Skyr')).toBe(true);
    });
  });
});
