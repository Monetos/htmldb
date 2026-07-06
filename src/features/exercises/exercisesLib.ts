import { db } from '../../db/database';

export async function toggleFavorite(exerciseId: string, current: boolean): Promise<void> {
  await db.exercises.update(exerciseId, { isFavorite: !current });
}
