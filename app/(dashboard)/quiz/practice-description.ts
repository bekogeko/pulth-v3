// Builds the meta description for quiz practice pages, padding with a generic
// line so short or missing entity descriptions don't produce a too-short tag.
export function createPracticeDescription(
    name: string,
    description: string | null | undefined,
    questionCount: number
) {
    const lead = questionCount > 0
        ? `Practice ${name} with ${questionCount} ${questionCount === 1 ? "question" : "questions"} on Pulth.`
        : `Practice ${name} on Pulth.`;
    const generic = "Answer interactive multiple-choice questions, check your answers instantly, and track your progress as you learn.";
    const body = description?.trim();

    let value = body ? `${lead} ${body}` : `${lead} ${generic}`;
    if (value.length < 120) {
        value = `${value} ${generic}`;
    }

    if (value.length <= 160) {
        return value;
    }

    // Truncate on a word boundary so the description reads cleanly.
    const truncated = value.slice(0, 157);
    const lastSpace = truncated.lastIndexOf(" ");
    return `${(lastSpace > 140 ? truncated.slice(0, lastSpace) : truncated).trimEnd()}...`;
}
