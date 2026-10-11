import { z } from "zod";

export const FIELD_TYPES = {
  text: "Короткий ответ",
  textarea: "Длинный ответ",
  select: "Выпадающий список",
  radio: "Один вариант",
  checkbox: "Несколько вариантов",
} as const;

export type FieldType = keyof typeof FIELD_TYPES;

export const LIMITS = {
  fields: 30,
  options: 30,
  label: 200,
  option: 150,
  text: 300,
  textarea: 3000,
};

export const fieldSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,40}$/),
  type: z.enum(["text", "textarea", "select", "radio", "checkbox"]),
  label: z.string().trim().min(1).max(LIMITS.label),
  required: z.boolean().default(false),
  maxLength: z.number().int().positive().max(LIMITS.textarea).optional(),
  placeholder: z.string().max(200).optional(),
  options: z.array(z.string().trim().min(1).max(LIMITS.option)).max(LIMITS.options).optional(),
});

export type FormField = z.infer<typeof fieldSchema>;

export const fieldsSchema = z
  .array(fieldSchema)
  .max(LIMITS.fields)
  .superRefine((fields, ctx) => {
    const ids = new Set<string>();
    fields.forEach((f, i) => {
      if (ids.has(f.id)) ctx.addIssue({ code: "custom", message: "Повтор id поля", path: [i, "id"] });
      ids.add(f.id);
      if (["select", "radio", "checkbox"].includes(f.type) && !(f.options && f.options.length > 0)) {
        ctx.addIssue({ code: "custom", message: `У поля «${f.label}» нет вариантов`, path: [i, "options"] });
      }
    });
  });

export type PublicForm = {
  slug: string;
  title: string;
  description: string;
  fields: FormField[];
  success_text: string;
};

export type Answers = Record<string, string | string[]>;

export function maxLen(f: FormField) {
  const cap = f.type === "textarea" ? LIMITS.textarea : LIMITS.text;
  return Math.min(f.maxLength ?? cap, cap);
}

/**
 * Строгая проверка ответов по описанию формы.
 * Лишние поля отбрасываются, варианты сверяются со списком,
 * длины ограничиваются. Используется и в браузере, и на сервере.
 */
export function validateAnswers(fields: FormField[], raw: unknown):
  | { ok: true; data: Answers }
  | { ok: false; errors: Record<string, string> } {
  const input = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const data: Answers = {};
  const errors: Record<string, string> = {};

  for (const f of fields) {
    const v = input[f.id];
    if (f.type === "checkbox") {
      const arr = Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
      const clean = [...new Set(arr)].filter((x) => f.options?.includes(x));
      if (f.required && clean.length === 0) errors[f.id] = "Выберите хотя бы один вариант";
      else if (clean.length) data[f.id] = clean;
      continue;
    }
    const s = typeof v === "string" ? v.replace(/\u0000/g, "").trim() : "";
    if (!s) {
      if (f.required) errors[f.id] = "Обязательное поле";
      continue;
    }
    if (f.type === "select" || f.type === "radio") {
      if (!f.options?.includes(s)) errors[f.id] = "Выберите вариант из списка";
      else data[f.id] = s;
      continue;
    }
    if (s.length > maxLen(f)) errors[f.id] = `Слишком длинно (максимум ${maxLen(f)} символов)`;
    else data[f.id] = s;
  }

  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, data };
}
