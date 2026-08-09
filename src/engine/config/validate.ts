import type {
  CommunityConfig,
  ConfigIssue,
  ConfigSummary,
  DayConfig,
  PracticeConfig,
  ReadingConfig,
} from "./types";

const datePattern = /^\d{4}-\d{2}-\d{2}$/;
const blockTypePattern = /^[A-Z][A-Z0-9_]*$/;

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isDate(value: unknown): value is string {
  if (typeof value !== "string" || !datePattern.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime())
    && parsed.toISOString().slice(0, 10) === value;
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function text(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function integer(value: unknown, minimum = 0): value is number {
  return Number.isInteger(value) && Number(value) >= minimum;
}

function validateReading(
  reading: unknown,
  issues: ConfigIssue[],
): asserts reading is ReadingConfig | undefined {
  if (reading === undefined) return;
  if (!isObject(reading)) {
    issues.push({ path: "reading", message: "Reading must be an object." });
    return;
  }

  if (!Array.isArray(reading.months)) {
    issues.push({ path: "reading.months", message: "Months must be an array." });
    return;
  }
  if (!Array.isArray(reading.books)) {
    issues.push({ path: "reading.books", message: "Books must be an array." });
    return;
  }

  const months = reading.months;
  const books = reading.books;

  months.forEach((month, index) => {
    const path = `reading.months[${index}]`;
    if (!isObject(month)) {
      issues.push({ path, message: "Month must be an object." });
      return;
    }
    if (!text(month.title)) issues.push({ path: `${path}.title`, message: "Title is required." });
    if (!isDate(month.startDate)) issues.push({ path: `${path}.startDate`, message: "Use YYYY-MM-DD." });
    if (!isDate(month.endDate)) issues.push({ path: `${path}.endDate`, message: "Use YYYY-MM-DD." });
    if (
      isDate(month.startDate)
      && isDate(month.endDate)
      && month.endDate < month.startDate
    ) {
      issues.push({ path, message: "End date must not be before start date." });
    }
    if (!integer(month.requiredCount, 0)) {
      issues.push({ path: `${path}.requiredCount`, message: "Required count must be a whole number of zero or more." });
    }
  });

  books.forEach((book, index) => {
    const path = `reading.books[${index}]`;
    if (!isObject(book)) {
      issues.push({ path, message: "Book must be an object." });
      return;
    }
    if (book.month !== null && (!integer(book.month, 1) || Number(book.month) > months.length)) {
      issues.push({ path: `${path}.month`, message: "Month must reference a valid reading month or be null." });
    }
    if (!integer(book.slot, 1)) issues.push({ path: `${path}.slot`, message: "Slot must be a whole number of one or more." });
    if (!text(book.title)) issues.push({ path: `${path}.title`, message: "Title is required." });
    if (!text(book.author)) issues.push({ path: `${path}.author`, message: "Author is required." });
    if (!text(book.assignment)) issues.push({ path: `${path}.assignment`, message: "Assignment is required." });
  });
}

function validatePractice(
  practice: unknown,
  issues: ConfigIssue[],
): asserts practice is PracticeConfig | undefined {
  if (practice === undefined) return;
  if (!isObject(practice)) {
    issues.push({ path: "practice", message: "Practice must be an object." });
    return;
  }
  if (!text(practice.title)) issues.push({ path: "practice.title", message: "Title is required." });
  if (!Array.isArray(practice.stages) || practice.stages.length === 0) {
    issues.push({ path: "practice.stages", message: "Add at least one practice stage." });
    return;
  }

  const stages = practice.stages;

  stages.forEach((stage, index) => {
    const path = `practice.stages[${index}]`;
    if (!isObject(stage)) {
      issues.push({ path, message: "Stage must be an object." });
      return;
    }
    if (!text(stage.title)) issues.push({ path: `${path}.title`, message: "Title is required." });
    if (!text(stage.goal)) issues.push({ path: `${path}.goal`, message: "Goal is required." });

    if (stage.unlockAfterStage !== undefined && stage.unlockAfterStage !== null) {
      if (!integer(stage.unlockAfterStage, 1) || Number(stage.unlockAfterStage) >= index + 1) {
        issues.push({
          path: `${path}.unlockAfterStage`,
          message: "A stage can unlock only after an earlier stage.",
        });
      }
    }

    if (!Array.isArray(stage.lessons) || stage.lessons.length === 0) {
      issues.push({ path: `${path}.lessons`, message: "Add at least one lesson." });
      return;
    }

    stage.lessons.forEach((lesson, lessonIndex) => {
      const lessonPath = `${path}.lessons[${lessonIndex}]`;
      if (!isObject(lesson)) {
        issues.push({ path: lessonPath, message: "Lesson must be an object." });
        return;
      }
      if (!text(lesson.title)) issues.push({ path: `${lessonPath}.title`, message: "Title is required." });
      if (!text(lesson.concept)) issues.push({ path: `${lessonPath}.concept`, message: "Concept is required." });
      if (!text(lesson.practiceAssignment)) issues.push({ path: `${lessonPath}.practiceAssignment`, message: "Practice assignment is required." });
      if (!text(lesson.reviewPrompts)) issues.push({ path: `${lessonPath}.reviewPrompts`, message: "Review prompts are required." });

      if (lesson.resources !== undefined) {
        if (!Array.isArray(lesson.resources)) {
          issues.push({ path: `${lessonPath}.resources`, message: "Resources must be an array." });
        } else {
          lesson.resources.forEach((resource, resourceIndex) => {
            const resourcePath = `${lessonPath}.resources[${resourceIndex}]`;
            if (!isObject(resource) || !text(resource.label) || !text(resource.url)) {
              issues.push({ path: resourcePath, message: "Each resource needs a label and URL." });
              return;
            }
            try {
              const url = new URL(resource.url);
              if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
            } catch {
              issues.push({ path: `${resourcePath}.url`, message: "Use an HTTP or HTTPS URL." });
            }
          });
        }
      }
    });
  });

  if (practice.categories !== undefined) {
    if (!Array.isArray(practice.categories)) {
      issues.push({ path: "practice.categories", message: "Categories must be an array." });
    } else {
      practice.categories.forEach((category, index) => {
        if (!text(category)) issues.push({ path: `practice.categories[${index}]`, message: "Category must contain text." });
      });
    }
  }

  if (practice.challenges !== undefined) {
    if (!Array.isArray(practice.challenges)) {
      issues.push({ path: "practice.challenges", message: "Challenges must be an array." });
    } else {
      practice.challenges.forEach((challenge, index) => {
        const path = `practice.challenges[${index}]`;
        if (!isObject(challenge)) {
          issues.push({ path, message: "Challenge must be an object." });
          return;
        }
        if (!integer(challenge.minimumStage, 1) || Number(challenge.minimumStage) > stages.length) {
          issues.push({ path: `${path}.minimumStage`, message: "Minimum stage must reference a valid stage." });
        }
        if (!text(challenge.title)) issues.push({ path: `${path}.title`, message: "Title is required." });
        if (!text(challenge.prompt)) issues.push({ path: `${path}.prompt`, message: "Prompt is required." });
      });
    }
  }
}

export function validateCommunityConfig(value: unknown): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  if (!isObject(value)) return [{ path: "$", message: "Configuration must be a JSON object." }];
  if (value.schemaVersion !== 1) {
    issues.push({ path: "schemaVersion", message: "Schema version must be 1." });
  }

  if (!isObject(value.plan)) {
    issues.push({ path: "plan", message: "Plan is required." });
    return issues;
  }

  const plan = value.plan;
  if (!text(plan.version)) issues.push({ path: "plan.version", message: "Version is required." });
  if (!text(plan.title)) issues.push({ path: "plan.title", message: "Title is required." });
  if (!isDate(plan.startDate)) issues.push({ path: "plan.startDate", message: "Use YYYY-MM-DD." });

  if (!Array.isArray(plan.weeks) || plan.weeks.length === 0) {
    issues.push({ path: "plan.weeks", message: "Add at least one week." });
  }

  const allDays: Array<{ day: DayConfig; path: string }> = [];
  if (Array.isArray(plan.weeks)) {
    plan.weeks.forEach((week, weekIndex) => {
      const path = `plan.weeks[${weekIndex}]`;
      if (!isObject(week)) {
        issues.push({ path, message: "Week must be an object." });
        return;
      }
      if (!text(week.title)) issues.push({ path: `${path}.title`, message: "Title is required." });
      if (week.phase !== undefined && !integer(week.phase, 1)) {
        issues.push({ path: `${path}.phase`, message: "Phase must be a whole number of one or more." });
      }
      if (!Array.isArray(week.days) || week.days.length === 0) {
        issues.push({ path: `${path}.days`, message: "Add at least one day." });
        return;
      }

      week.days.forEach((day, dayIndex) => {
        const dayPath = `${path}.days[${dayIndex}]`;
        if (!isObject(day)) {
          issues.push({ path: dayPath, message: "Day must be an object." });
          return;
        }
        allDays.push({ day: day as unknown as DayConfig, path: dayPath });
        if (!isDate(day.date)) issues.push({ path: `${dayPath}.date`, message: "Use YYYY-MM-DD." });
        if (typeof day.rest !== "boolean") issues.push({ path: `${dayPath}.rest`, message: "Rest must be true or false." });
        if (day.phase !== undefined && !integer(day.phase, 1)) {
          issues.push({ path: `${dayPath}.phase`, message: "Phase must be a whole number of one or more." });
        }
        if (!Array.isArray(day.blocks)) {
          issues.push({ path: `${dayPath}.blocks`, message: "Blocks must be an array." });
        } else {
          if (day.rest === false && day.blocks.length === 0) {
            issues.push({ path: `${dayPath}.blocks`, message: "An active day needs at least one block." });
          }
          day.blocks.forEach((block, blockIndex) => {
            const blockPath = `${dayPath}.blocks[${blockIndex}]`;
            if (!isObject(block)) {
              issues.push({ path: blockPath, message: "Block must be an object." });
              return;
            }
            if (!text(block.type) || !blockTypePattern.test(block.type)) {
              issues.push({ path: `${blockPath}.type`, message: "Use uppercase letters, numbers, and underscores. Start with a letter." });
            }
            if (!text(block.label)) issues.push({ path: `${blockPath}.label`, message: "Label is required." });
            if (!integer(block.plannedMinutes, 1) || Number(block.plannedMinutes) > 1440) {
              issues.push({ path: `${blockPath}.plannedMinutes`, message: "Planned minutes must be a whole number from 1 to 1440." });
            }
            if (!text(block.instructions)) issues.push({ path: `${blockPath}.instructions`, message: "Instructions are required." });
            if (typeof block.required !== "boolean") issues.push({ path: `${blockPath}.required`, message: "Required must be true or false." });
          });
        }

        if (!Array.isArray(day.definitionOfDone)) {
          issues.push({ path: `${dayPath}.definitionOfDone`, message: "Definition of done must be an array." });
        } else {
          day.definitionOfDone.forEach((item, itemIndex) => {
            if (!text(item)) {
              issues.push({ path: `${dayPath}.definitionOfDone[${itemIndex}]`, message: "Each item must contain text." });
            }
          });
        }
      });
    });
  }

  if (allDays.length > 0) {
    if (isDate(plan.startDate) && allDays[0]?.day.date !== plan.startDate) {
      issues.push({ path: "plan.startDate", message: "Start date must match the first plan day." });
    }

    for (let index = 0; index < allDays.length; index += 1) {
      const current = allDays[index];
      if (!current || !isDate(current.day.date)) continue;
      if (index > 0) {
        const previous = allDays[index - 1];
        if (previous && isDate(previous.day.date)) {
          const expected = addDays(previous.day.date, 1);
          if (current.day.date !== expected) {
            issues.push({
              path: `${current.path}.date`,
              message: `Plan dates must be contiguous. Expected ${expected}.`,
            });
          }
        }
      }
    }
  }

  if (plan.resources !== undefined) {
    if (!Array.isArray(plan.resources)) {
      issues.push({ path: "plan.resources", message: "Resources must be an array." });
    } else {
      const urls = new Set<string>();
      plan.resources.forEach((resource, index) => {
        const path = `plan.resources[${index}]`;
        if (!isObject(resource) || !text(resource.label) || !text(resource.url)) {
          issues.push({ path, message: "Each resource needs a label and URL." });
          return;
        }
        try {
          const url = new URL(resource.url);
          if (url.protocol !== "http:" && url.protocol !== "https:") throw new Error();
          if (urls.has(resource.url)) issues.push({ path: `${path}.url`, message: "Resource URL is duplicated." });
          urls.add(resource.url);
        } catch {
          issues.push({ path: `${path}.url`, message: "Use an HTTP or HTTPS URL." });
        }
      });
    }
  }

  if (!Array.isArray(value.skills)) {
    issues.push({ path: "skills", message: "Skills must be an array." });
  } else {
    const codes = new Set<string>();
    const names = new Set<string>();
    value.skills.forEach((skill, index) => {
      const path = `skills[${index}]`;
      if (!isObject(skill)) {
        issues.push({ path, message: "Skill must be an object." });
        return;
      }
      if (!text(skill.code)) issues.push({ path: `${path}.code`, message: "Code is required." });
      else if (codes.has(skill.code)) issues.push({ path: `${path}.code`, message: "Skill code is duplicated." });
      else codes.add(skill.code);
      if (!text(skill.name)) issues.push({ path: `${path}.name`, message: "Name is required." });
      else if (names.has(skill.name)) issues.push({ path: `${path}.name`, message: "Skill name is duplicated." });
      else names.add(skill.name);
      if (!text(skill.family)) issues.push({ path: `${path}.family`, message: "Family is required." });
    });
  }

  if (!Array.isArray(value.projects)) {
    issues.push({ path: "projects", message: "Projects must be an array." });
  } else {
    const projectCodes = new Set<string>();
    value.projects.forEach((project, index) => {
      const path = `projects[${index}]`;
      if (!isObject(project)) {
        issues.push({ path, message: "Project must be an object." });
        return;
      }
      if (!text(project.code)) issues.push({ path: `${path}.code`, message: "Code is required." });
      else if (projectCodes.has(project.code)) issues.push({ path: `${path}.code`, message: "Project code is duplicated." });
      else projectCodes.add(project.code);
      if (!text(project.name)) issues.push({ path: `${path}.name`, message: "Name is required." });
      if (!text(project.coreIntegration)) issues.push({ path: `${path}.coreIntegration`, message: "Core integration is required." });
      if (!integer(project.startDay, 1) || Number(project.startDay) > allDays.length) {
        issues.push({ path: `${path}.startDay`, message: "Start day must reference a plan day." });
      }
      if (!integer(project.endDay, 1) || Number(project.endDay) > allDays.length) {
        issues.push({ path: `${path}.endDay`, message: "End day must reference a plan day." });
      }
      if (
        integer(project.startDay, 1)
        && integer(project.endDay, 1)
        && Number(project.endDay) < Number(project.startDay)
      ) {
        issues.push({ path, message: "Project end day must not be before start day." });
      }
      if (!text(project.defenceAssessmentType)) {
        issues.push({ path: `${path}.defenceAssessmentType`, message: "Defence assessment type is required." });
      }
      if (!Array.isArray(project.milestones) || project.milestones.length === 0) {
        issues.push({ path: `${path}.milestones`, message: "Add at least one project milestone." });
      } else {
        project.milestones.forEach((milestone, milestoneIndex) => {
          const milestonePath = `${path}.milestones[${milestoneIndex}]`;
          if (!isObject(milestone)) {
            issues.push({ path: milestonePath, message: "Milestone must be an object." });
            return;
          }
          if (!text(milestone.title)) issues.push({ path: `${milestonePath}.title`, message: "Title is required." });
          if (!text(milestone.description)) issues.push({ path: `${milestonePath}.description`, message: "Description is required." });
        });
      }
    });
  }

  validateReading(value.reading, issues);
  validatePractice(value.practice, issues);

  return issues;
}

export function parseCommunityConfig(raw: string): {
  config: CommunityConfig | null;
  issues: ConfigIssue[];
} {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {
      config: null,
      issues: [{ path: "$", message: "File is not valid JSON." }],
    };
  }

  const issues = validateCommunityConfig(parsed);
  return {
    config: issues.length === 0 ? parsed as CommunityConfig : null,
    issues,
  };
}

export function summarizeCommunityConfig(config: CommunityConfig): ConfigSummary {
  const days = config.plan.weeks.flatMap((week) => week.days);
  const blocks = days.reduce((sum, day) => sum + day.blocks.length, 0);
  const practiceStages = config.practice?.stages.length ?? 0;
  const practiceLessons = config.practice?.stages.reduce(
    (sum, stage) => sum + stage.lessons.length,
    0,
  ) ?? 0;

  return {
    title: config.plan.title,
    version: config.plan.version,
    startDate: config.plan.startDate,
    endDate: days.at(-1)?.date ?? config.plan.startDate,
    weeks: config.plan.weeks.length,
    days: days.length,
    activeDays: days.filter((day) => !day.rest).length,
    restDays: days.filter((day) => day.rest).length,
    blocks,
    skills: config.skills.length,
    projects: config.projects.length,
    readingBooks: config.reading?.books.length ?? 0,
    practiceStages,
    practiceLessons,
  };
}
