import { Link } from "react-router-dom";
import { useForms } from "@/hooks/useForms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Settings, ChevronRight, Inbox } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function FormsListPage() {
  const { data: forms, isLoading, error } = useForms();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Failed to load forms</p>
      </div>
    );
  }

  if (!forms || forms.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">No forms yet</h2>
        <p className="text-muted-foreground max-w-md">
          Forms will appear here once you receive your first submission.
          Point your HTML form to your Freeform endpoint to get started.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Forms</h1>
        <p className="text-muted-foreground">
          Manage your form submissions
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {forms.map((form) => (
          <Card key={form.id} className="hover:border-primary/50 transition-colors">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-base font-medium truncate">
                    {form.email}
                  </CardTitle>
                </div>
                {form.unread_count > 0 && (
                  <Badge variant="default">
                    {form.unread_count} new
                  </Badge>
                )}
              </div>
              <CardDescription>
                {form.submission_count} {form.submission_count === 1 ? "submission" : "submissions"}
                {form.latest_submission_at && (
                  <> · Last {formatDistanceToNow(new Date(form.latest_submission_at), { addSuffix: true })}</>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex gap-2">
                <Button asChild className="flex-1">
                  <Link to={`/forms/${form.id}`}>
                    View
                    <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="outline" size="icon" asChild>
                  <Link to={`/forms/${form.id}/settings`}>
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
