import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import { useSubmissions, useBulkUpdateSubmissions, useBulkDeleteSubmissions } from "@/hooks/useSubmissions";
import { useForm } from "@/hooks/useForms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  Search,
  Download,
  ChevronLeft,
  ChevronRight,
  Mail,
  MailOpen,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { api } from "@/lib/api";

export function SubmissionsPage() {
  const { formId } = useParams<{ formId: string }>();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const { data: form } = useForm(formId || "");
  const { data, isLoading, error } = useSubmissions(formId || "", {
    page,
    limit: 25,
    search: search || undefined,
  });

  const bulkUpdate = useBulkUpdateSubmissions(formId || "");
  const bulkDelete = useBulkDeleteSubmissions(formId || "");

  const submissions = data?.data || [];
  const pagination = data?.pagination;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(submissions.map((s) => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelect = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleMarkRead = async () => {
    try {
      await bulkUpdate.mutateAsync({ ids: selectedIds, is_read: true });
      setSelectedIds([]);
      toast.success("Marked as read");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleMarkUnread = async () => {
    try {
      await bulkUpdate.mutateAsync({ ids: selectedIds, is_read: false });
      setSelectedIds([]);
      toast.success("Marked as unread");
    } catch {
      toast.error("Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${selectedIds.length} submissions? This cannot be undone.`)) {
      return;
    }
    try {
      await bulkDelete.mutateAsync(selectedIds);
      setSelectedIds([]);
      toast.success("Deleted successfully");
    } catch {
      toast.error("Failed to delete");
    }
  };

  const handleExport = () => {
    const url = api.getExportUrl(formId || "", { search: search || undefined });
    window.open(url, "_blank");
  };

  const getPreview = (data: Record<string, unknown>): string => {
    const values = Object.entries(data)
      .filter(([key]) => !key.startsWith("_"))
      .map(([, value]) => String(value))
      .join(" ");
    return values.slice(0, 100) + (values.length > 100 ? "..." : "");
  };

  const getEmail = (data: Record<string, unknown>): string | null => {
    const emailKeys = ["email", "_replyto", "Email", "EMAIL"];
    for (const key of emailKeys) {
      if (data[key] && typeof data[key] === "string") {
        return data[key] as string;
      }
    }
    return null;
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
        <p className="text-destructive">Failed to load submissions</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link to="/">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{form?.email || "Submissions"}</h1>
          <p className="text-muted-foreground">
            {pagination?.total || 0} submissions
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search submissions..."
            className="pl-9"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 rounded-lg border bg-muted/50 p-3">
          <span className="text-sm font-medium">
            {selectedIds.length} selected
          </span>
          <div className="ml-auto flex gap-2">
            <Button size="sm" variant="outline" onClick={handleMarkRead}>
              <MailOpen className="mr-1 h-4 w-4" />
              Mark Read
            </Button>
            <Button size="sm" variant="outline" onClick={handleMarkUnread}>
              <Mail className="mr-1 h-4 w-4" />
              Mark Unread
            </Button>
            <Button size="sm" variant="destructive" onClick={handleDelete}>
              <Trash2 className="mr-1 h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      )}

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedIds.length === submissions.length && submissions.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Email</TableHead>
              <TableHead className="hidden md:table-cell">Preview</TableHead>
              <TableHead className="w-24">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {submissions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No submissions found
                </TableCell>
              </TableRow>
            ) : (
              submissions.map((submission) => (
                <TableRow
                  key={submission.id}
                  className={submission.is_read ? "" : "bg-muted/30 font-medium"}
                >
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.includes(submission.id)}
                      onCheckedChange={(checked) => handleSelect(submission.id, !!checked)}
                    />
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <Link
                      to={`/forms/${formId}/submissions/${submission.id}`}
                      className="hover:underline"
                    >
                      {format(new Date(submission.created_at), "MMM d, yyyy")}
                      <span className="text-muted-foreground ml-2">
                        {format(new Date(submission.created_at), "h:mm a")}
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell>
                    <Link
                      to={`/forms/${formId}/submissions/${submission.id}`}
                      className="hover:underline"
                    >
                      {getEmail(submission.data) || "-"}
                    </Link>
                  </TableCell>
                  <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground">
                    {getPreview(submission.data)}
                  </TableCell>
                  <TableCell>
                    {submission.is_read ? (
                      <Badge variant="secondary">Read</Badge>
                    ) : (
                      <Badge>New</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {pagination && pagination.total > pagination.limit && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pagination.limit + 1} to{" "}
            {Math.min(page * pagination.limit, pagination.total)} of {pagination.total}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
              disabled={!pagination.has_more}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
