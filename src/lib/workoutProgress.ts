export const MIN_COMPLETED_EXERCISES_FOR_WORKOUT_DAY = 3;

type ExerciseLike = {
  completed?: boolean;
};

export function getCompletedExerciseCount(exercises?: ExerciseLike[] | null): number {
  if (!exercises || exercises.length === 0) {
    return 0;
  }

  return exercises.filter((exercise) => exercise.completed === true).length;
}

export function isWorkoutDayCompleted(exercises?: ExerciseLike[] | null): boolean {
  return getCompletedExerciseCount(exercises) >= MIN_COMPLETED_EXERCISES_FOR_WORKOUT_DAY;
}
