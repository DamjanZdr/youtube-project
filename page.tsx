import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{ studioSlug: string; projectId: string }>;
}

export default async function ProjectPage({ params }: PageProps) {
  const { studioSlug, projectId } = await params;
  redirect(+""+/studio/+""+${studioSlug}/project/+""+${projectId}/idea+""+);
}