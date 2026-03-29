export type ExerciseType = "strength" | "cardio" | "custom";

export type ExerciseAlternative = {
  name: string;
  sets?: number | string;
  reps?: string;
  rest?: number;
  weight?: number;
  minutes?: number;
  averageSpeed?: number;
  intensity?: string;
  activityTemplateId?: string;
  videoUrl?: string;
};

export type ExerciseSelection = "primary" | "alternative";

export type ExerciseWithAlternative = {
  name: string;
  type?: ExerciseType;
  sets?: number | string;
  reps?: string;
  rest?: number;
  weight?: number;
  minutes?: number;
  averageSpeed?: number;
  intensity?: string;
  activityTemplateId?: string;
  videoUrl?: string;
  alternative?: ExerciseAlternative;
  selectedOption?: ExerciseSelection;
};

export function hasAlternativeExercise(exercise?: ExerciseWithAlternative | null): boolean {
  return Boolean(exercise?.alternative);
}

export function getSelectedExercise(exercise: ExerciseWithAlternative): ExerciseWithAlternative {
  if (exercise.selectedOption !== "alternative" || !exercise.alternative) {
    return exercise;
  }

  return {
    ...exercise,
    ...exercise.alternative,
  };
}

export function isCardioExercise(exercise: ExerciseWithAlternative): boolean {
  const selectedExercise = getSelectedExercise(exercise);
  const exerciseName = selectedExercise.name.toLowerCase();

  return (
    selectedExercise.type === "cardio" ||
    selectedExercise.name.includes("🚶") ||
    selectedExercise.name.includes("🏃") ||
    exerciseName.includes("cardio") ||
    selectedExercise.minutes !== undefined
  );
}
