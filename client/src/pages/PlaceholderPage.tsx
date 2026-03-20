// Developed by Sydney Edwards
import { PageHeader } from "../components/common/PageHeader";
import { Card } from "../components/common/Card";

export function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-4">
      <PageHeader title={title} subtitle="Page scaffold is ready. Feature logic comes next." />
      <Card padding="md">
        <h2 className="font-heading text-2xl text-[var(--color-text-primary)]">{title}</h2>
      </Card>
    </div>
  );
}

