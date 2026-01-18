import { useParams, Link } from "react-router-dom";
import { useForm, useUpdateForm, type FormSettings } from "@/hooks/useForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, ArrowLeft, Save, Hammer } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

export function FormSettingsPage() {
  const { formId } = useParams<{ formId: string }>();
  const { data: form, isLoading, error } = useForm(formId || "");
  const updateMutation = useUpdateForm(formId || "");

  const [formName, setFormName] = useState("");
  const [settings, setSettings] = useState<Partial<FormSettings>>({
    default_subject: "",
    webhook_url: "",
    cc_emails: [],
  });

  useEffect(() => {
    if (form) {
      setFormName(form.name || "");
      setSettings({
        default_subject: form.settings.default_subject || "",
        webhook_url: form.settings.webhook_url || "",
        cc_emails: form.settings.cc_emails || [],
      });
    }
  }, [form]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      await updateMutation.mutateAsync({
        name: formName,
        settings,
      });
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="text-center py-12">
        <p className="text-destructive">Form not found</p>
        <Button variant="link" asChild className="mt-4">
          <Link to="/">Back to forms</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to={`/forms/${formId}`}>
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Form Settings</h1>
          <p className="text-muted-foreground">{form.name || "Untitled Form"}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>General</CardTitle>
            <CardDescription>
              Basic form information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Form Name</Label>
              <Input
                id="name"
                placeholder="Contact Form"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Notification Email</Label>
              <Input
                id="email"
                type="email"
                value={form.email}
                disabled
                className="bg-muted"
              />
              <p className="text-sm text-muted-foreground">
                Submissions are sent to this address. Contact support to change.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Email Settings</CardTitle>
            <CardDescription>
              Configure how email notifications are sent
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Default Subject</Label>
              <Input
                id="subject"
                placeholder="New form submission"
                value={settings.default_subject || ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, default_subject: e.target.value }))
                }
              />
              <p className="text-sm text-muted-foreground">
                Subject line for email notifications. Can be overridden with _subject field.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cc">CC Emails</Label>
              <Input
                id="cc"
                placeholder="email1@example.com, email2@example.com"
                value={(settings.cc_emails || []).join(", ")}
                onChange={(e) =>
                  setSettings((prev) => ({
                    ...prev,
                    cc_emails: e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  }))
                }
              />
              <p className="text-sm text-muted-foreground">
                Additional email addresses to CC on all submissions (comma-separated)
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Form Builder</CardTitle>
            <CardDescription>
              Design your form fields and generate embed code
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Use the visual form builder to create fields, configure validation,
              and generate HTML code to embed on your website.
            </p>
            <Button variant="outline" asChild>
              <Link to={`/forms/${formId}/builder`}>
                <Hammer className="mr-2 h-4 w-4" />
                Open Form Builder
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Webhook Integration</CardTitle>
            <CardDescription>
              Send submission data to an external URL
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="webhook">Webhook URL</Label>
              <Input
                id="webhook"
                type="url"
                placeholder="https://example.com/webhook"
                value={settings.webhook_url || ""}
                onChange={(e) =>
                  setSettings((prev) => ({ ...prev, webhook_url: e.target.value || null }))
                }
              />
              <p className="text-sm text-muted-foreground">
                POST requests will be sent to this URL for each submission
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Settings
          </Button>
        </div>
      </form>
    </div>
  );
}
