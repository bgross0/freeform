import { useParams, Link, useNavigate } from "react-router-dom";
import { useSubmission, useUpdateSubmission, useDeleteSubmission } from "@/hooks/useSubmissions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, ArrowLeft, Mail, MailOpen, Trash2, Clock, Globe, Monitor } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { useState } from "react";

export function SubmissionDetailPage() {
  const { formId, submissionId } = useParams<{ formId: string; submissionId: string }>();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  const { data: submission, isLoading, error } = useSubmission(formId || "", submissionId || "");
  const updateMutation = useUpdateSubmission(formId || "");
  const deleteMutation = useDeleteSubmission(formId || "");

  const handleToggleRead = async () => {
    if (!submission) return;
    try {
      await updateMutation.mutateAsync({
        submissionId: submission.id,
        data: { is_read: !submission.is_read },
      });
      toast.success(submission.is_read ? "Marked as unread" : "Marked as read");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!submissionId) return;
    try {
      await deleteMutation.mutateAsync(submissionId);
      toast.success("Submission deleted");
      navigate(`/forms/${formId}`);
    } catch {
      toast.error("Failed to delete");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Submission not found</p>
        <Button variant="link" asChild className="mt-4">
          <Link to={`/forms/${formId}`}>Back to submissions</Link>
        </Button>
      </div>
    );
  }

  // Filter out special fields for display
  const formFields = Object.entries(submission.data).filter(
    ([key]) => !key.startsWith("_")
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to={`/forms/${formId}`}>
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Submission Details</h1>
            <p className="text-muted-foreground">
              {format(new Date(submission.created_at), "MMMM d, yyyy 'at' h:mm a")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={submission.is_read ? "secondary" : "default"}>
            {submission.is_read ? "Read" : "New"}
          </Badge>
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant="outline" onClick={handleToggleRead} disabled={updateMutation.isPending}>
          {submission.is_read ? (
            <>
              <Mail className="mr-2 h-4 w-4" />
              Mark Unread
            </>
          ) : (
            <>
              <MailOpen className="mr-2 h-4 w-4" />
              Mark Read
            </>
          )}
        </Button>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete Submission</DialogTitle>
              <DialogDescription>
                Are you sure you want to delete this submission? This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Form Data</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              {formFields.length === 0 ? (
                <p className="text-muted-foreground">No form data</p>
              ) : (
                formFields.map(([key, value]) => (
                  <div key={key}>
                    <dt className="text-sm font-medium text-muted-foreground capitalize">
                      {key.replace(/_/g, " ")}
                    </dt>
                    <dd className="mt-1 text-sm break-words">
                      {typeof value === "object" ? JSON.stringify(value, null, 2) : String(value)}
                    </dd>
                  </div>
                ))
              )}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metadata</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="space-y-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <dt className="text-sm font-medium text-muted-foreground">Submitted</dt>
                  <dd className="text-sm">
                    {format(new Date(submission.created_at), "MMMM d, yyyy 'at' h:mm:ss a")}
                  </dd>
                </div>
              </div>
              {submission.ip_address && (
                <div className="flex items-start gap-3">
                  <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">IP Address</dt>
                    <dd className="text-sm font-mono">{submission.ip_address}</dd>
                  </div>
                </div>
              )}
              {submission.user_agent && (
                <div className="flex items-start gap-3">
                  <Monitor className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <dt className="text-sm font-medium text-muted-foreground">User Agent</dt>
                    <dd className="text-sm text-muted-foreground break-all">
                      {submission.user_agent}
                    </dd>
                  </div>
                </div>
              )}
              <div>
                <dt className="text-sm font-medium text-muted-foreground">Submission ID</dt>
                <dd className="text-sm font-mono text-muted-foreground">{submission.id}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
