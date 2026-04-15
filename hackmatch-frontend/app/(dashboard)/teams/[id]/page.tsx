type TeamDetailsPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function TeamDetailsPage({
  params,
}: TeamDetailsPageProps) {
  const { id } = await params;

  return <div>Team Details Page: {id}</div>;
}
