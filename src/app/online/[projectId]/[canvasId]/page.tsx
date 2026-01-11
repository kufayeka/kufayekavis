import { OnlineViewer } from "../../OnlineViewer";

export default async function OnlineProjectCanvasPage(props: { params: Promise<{ projectId: string; canvasId: string }> }) {
  const { projectId, canvasId } = await props.params;
  return <OnlineViewer key={`${projectId}/${canvasId}`} projectId={projectId} canvasId={canvasId} />;
}
