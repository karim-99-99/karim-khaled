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
