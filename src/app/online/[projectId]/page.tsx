import { OnlineViewer } from "../OnlineViewer";

export default async function OnlineProjectPage(props: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await props.params;
  return <OnlineViewer key={projectId} projectId={projectId} />;
}
