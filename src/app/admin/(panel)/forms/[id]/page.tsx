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
    <div>
      <FormHeader form={form} responses={responses} active="questions" />

      <div className="card-flat" style={{ marginBottom: 20 }}>
        <div className="label" style={{ marginBottom: 8 }}>Ссылка для учеников</div>
        <CopyLink url={await publicUrl(form.slug)} title={form.title} />
      </div>

      {!fields.success && <div className="alert alert-err" style={{ marginBottom: 12 }}>Вопросы в базе повреждены — соберите их заново.</div>}
      <ActionForm action={saveFormFields} sticky="Сохранить">
        <input type="hidden" name="id" value={form.id} />
        <FieldsBuilder initial={fields.success ? fields.data : []} hasResponses={responses > 0} />
      </ActionForm>
    </div>
  );
}
