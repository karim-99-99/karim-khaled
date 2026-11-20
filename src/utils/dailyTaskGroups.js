/** Split daily tasks into تأسيس vs تجميعات using API flags / category name. */
export function splitTasksByKind(tasks = []) {
  const foundation = [];
  const banks = [];
  tasks.forEach((task) => {
    const name = task?.category_name || "";
    const isBank = Boolean(task?.is_bank) || name.includes("تجميع");
    if (isBank) banks.push(task);
    else foundation.push(task);
  });
  return { foundation, banks };
}

export function taskKindLabel(task) {
  const name = task?.category_name || "";
  if (task?.is_bank || name.includes("تجميع")) return "تجميعات";
  if (name.includes("تأسيس")) return "تأسيس";
  return "تأسيس";
}

export function isQuantitativeSubject(task) {
  const subject = task?.subject_name || "";
  return subject.includes("كمي");
}

export function isVerbalSubject(task) {
  const subject = task?.subject_name || "";
  return subject.includes("لفظي");
}

export function subjectBadgeLabel(task) {
  if (isQuantitativeSubject(task)) return "كمي";
  if (isVerbalSubject(task)) return "لفظي";
  return task?.subject_name || "";
}

/** Subtitle under the lesson name, matching the courses page design. */
export function taskSubtitle(task) {
  const kind = taskKindLabel(task);
  if (kind === "تجميعات") return "بنك أسئلة - تجميعات";
  if (task?.chapter_name) return `واجب - ${task.chapter_name}`;
  return "واجب - تأسيس";
}

export function formatArabicTaskDate(iso) {
  if (!iso) {
    return new Date().toLocaleDateString("ar-EG", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });
  }
  return new Date(`${iso}T12:00:00`).toLocaleDateString("ar-EG", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}
