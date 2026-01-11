import { DesignerApp } from "../../../designer/ui/components/DesignerApp";

export default async function EditProjectPage(props: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await props.params;
  return <DesignerApp projectId={projectId ?? ""} />;
}
