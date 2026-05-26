import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
};

export const AuthCard = ({ title, description, children, footer }: Props) => (
  <div className="flex min-h-full w-full items-center justify-center p-6">
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="text-2xl">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent className="space-y-4">{children}</CardContent>
      {footer && <div className="px-6 pb-6 text-sm text-muted-foreground">{footer}</div>}
    </Card>
  </div>
);
