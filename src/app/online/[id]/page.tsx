import { OnlineViewer } from "../OnlineViewer";

export default async function OnlineProjectPage(props: { params: Promise<{ id: string }> }) {
  const { id } = await props.params;
  return <OnlineViewer key={id} projectId={id} />;
}
