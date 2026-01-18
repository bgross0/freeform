import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useForms, useCreateForm } from "@/hooks/useForms";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Mail, Settings, ChevronRight, Inbox, Plus, FileText } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

export function FormsListPage() {
  const navigate = useNavigate();
  const { data: forms, isLoading, error } = useForms();
  const createForm = useCreateForm();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newFormName, setNewFormName] = useState("");
  const [newFormEmail, setNewFormEmail] = useState("");

  const handleCreateForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormName.trim() || !newFormEmail.trim()) return;

    try {
      const form = await createForm.mutateAsync({
        name: newFormName.trim(),
        email: newFormEmail.trim(),
      });
      setShowCreateDialog(false);
      setNewFormName("");
      setNewFormEmail("");
      toast.success("Form created successfully");
      navigate(`/forms/${form.id}/builder`);
    } catch {
      toast.error("Failed to create form");
    }
  };

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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Forms</h1>
          <p className="text-muted-foreground">
            Manage your forms and submissions
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Form
        </Button>
      </div>

      {!forms || forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No forms yet</h2>
          <p className="text-muted-foreground max-w-md mb-4">
            Create your first form to start collecting submissions.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {forms.map((form) => (
            <Card key={form.id} className="hover:border-primary/50 transition-colors">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <CardTitle className="text-base font-medium truncate">
                      {form.name || "Untitled Form"}
                    </CardTitle>
                  </div>
                  {form.unread_count > 0 && (
                    <Badge variant="default" className="shrink-0 ml-2">
                      {form.unread_count} new
                    </Badge>
                  )}
                </div>
                <CardDescription className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{form.email}</span>
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-3">
                  {form.submission_count} {form.submission_count === 1 ? "submission" : "submissions"}
                  {form.latest_submission_at && (
                    <> · Last {formatDistanceToNow(new Date(form.latest_submission_at), { addSuffix: true })}</>
                  )}
                </p>
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
      )}

      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
          <form onSubmit={handleCreateForm}>
            <DialogHeader>
              <DialogTitle>Create New Form</DialogTitle>
              <DialogDescription>
                Give your form a name and set the email address where submissions will be sent.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="form-name">Form Name</Label>
                <Input
                  id="form-name"
                  placeholder="Contact Form"
                  value={newFormName}
                  onChange={(e) => setNewFormName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="form-email">Notification Email</Label>
                <Input
                  id="form-email"
                  type="email"
                  placeholder="you@example.com"
                  value={newFormEmail}
                  onChange={(e) => setNewFormEmail(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Submissions will be sent to this email address
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowCreateDialog(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!newFormName.trim() || !newFormEmail.trim() || createForm.isPending}
              >
                {createForm.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create Form
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
