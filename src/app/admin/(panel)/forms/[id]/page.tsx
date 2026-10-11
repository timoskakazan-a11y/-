import { loadForm, FormHeader, publicUrl } from "@/components/FormHeader";
import { ActionForm } from "@/components/ActionForm";
import { FieldsBuilder } from "@/components/FieldsBuilder";
import { CopyLink } from "@/components/CopyLink";
import { fieldsSchema } from "@/lib/forms";
import { saveFormFields } from "@/app/admin/actions";

export default async function FormQuestions({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { form, responses } = await loadForm(id);
  const fields = fieldsSchema.safeParse(form.fields);

  return (
    <div className="narrow-admin">
      <FormHeader form={form} responses={responses} active="questions" />

      <section style={{ marginBottom: 32 }}>
        <div className="group-title">Ссылка для учеников</div>
        <CopyLink url={await publicUrl(form.slug)} title={form.title} />
      </section>

      {!fields.success && <div className="alert alert-err" style={{ marginBottom: 12 }}>Вопросы в базе повреждены — соберите их заново.</div>}
      <ActionForm action={saveFormFields} saveBar="Сохранить">
        <input type="hidden" name="id" value={form.id} />
        <div className="group-title" style={{ marginTop: 8 }}>Вопросы</div>
        <FieldsBuilder initial={fields.success ? fields.data : []} hasResponses={responses > 0} />
      </ActionForm>
    </div>
  );
}
