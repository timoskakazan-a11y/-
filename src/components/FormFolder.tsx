import { Folder } from "./Folder";
import { colorFor } from "@/lib/palette";
import { isAccepting } from "@/lib/admin-data";

type F = { id: string; title: string; is_open: boolean; closes_at: string | null; max_responses: number | null; responses: number };

export function FormFolder({ f }: { f: F }) {
  const open = isAccepting(f, f.responses);
  return (
    <Folder
      href={`/admin/forms/${f.id}`}
      color={open ? colorFor(f.id) : "f-gray"}
      title={f.title}
      badge={f.responses}
      sub={open ? "Принимает ответы" : "Приём закрыт"}
      icon="forms"
      papers={f.responses > 0 ? 2 : 1}
    />
  );
}
