import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import type { FormFieldDefinition } from "@/lib/api";
import { ScrollArea } from "@/components/ui/scroll-area";

interface FormPreviewProps {
  open: boolean;
  onClose: () => void;
  fields: FormFieldDefinition[];
  formEmail: string;
}

function PreviewField({ field }: { field: FormFieldDefinition }) {
  const labelText = (
    <>
      {field.label}
      {field.required && <span className="text-destructive ml-1">*</span>}
    </>
  );

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "number":
    case "date":
      return (
        <div className="space-y-2">
          <Label>{labelText}</Label>
          <Input
            type={
              field.type === "phone"
                ? "tel"
                : field.type === "text"
                  ? "text"
                  : field.type
            }
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            disabled
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "textarea":
      return (
        <div className="space-y-2">
          <Label>{labelText}</Label>
          <Textarea
            placeholder={field.placeholder}
            defaultValue={field.defaultValue}
            rows={4}
            disabled
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "select":
      return (
        <div className="space-y-2">
          <Label>{labelText}</Label>
          <Select disabled>
            <SelectTrigger>
              <SelectValue placeholder="Select..." />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "radio":
      return (
        <div className="space-y-2">
          <Label>{labelText}</Label>
          <RadioGroup disabled>
            {field.options?.map((opt) => (
              <div key={opt.value} className="flex items-center space-x-2">
                <RadioGroupItem value={opt.value} id={`${field.id}-${opt.value}`} />
                <Label htmlFor={`${field.id}-${opt.value}`} className="font-normal">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "checkbox":
      if (field.options && field.options.length > 0) {
        return (
          <div className="space-y-2">
            <Label>{labelText}</Label>
            <div className="space-y-2">
              {field.options.map((opt) => (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox id={`${field.id}-${opt.value}`} disabled />
                  <Label
                    htmlFor={`${field.id}-${opt.value}`}
                    className="font-normal"
                  >
                    {opt.label}
                  </Label>
                </div>
              ))}
            </div>
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        );
      }
      return (
        <div className="flex items-center space-x-2">
          <Checkbox id={field.id} disabled />
          <Label htmlFor={field.id} className="font-normal">
            {labelText}
          </Label>
        </div>
      );

    case "file":
      return (
        <div className="space-y-2">
          <Label>{labelText}</Label>
          <Input
            type="file"
            accept={field.validation?.accept}
            disabled
          />
          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      );

    case "hidden":
      return null;

    case "section":
      return (
        <div className="pt-4 pb-2 border-t">
          <h3 className="text-lg font-semibold">{field.label}</h3>
          {field.sectionContent && (
            <p className="text-sm text-muted-foreground mt-1">
              {field.sectionContent}
            </p>
          )}
        </div>
      );

    default:
      return null;
  }
}

export function FormPreview({
  open,
  onClose,
  fields,
  formEmail,
}: FormPreviewProps) {
  const visibleFields = fields.filter((f) => f.type !== "hidden");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Form Preview</DialogTitle>
        </DialogHeader>

        <ScrollArea className="flex-1 -mx-6 px-6">
          <div className="space-y-4 py-2">
            {visibleFields.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No fields to preview. Add some fields first.
              </p>
            ) : (
              visibleFields.map((field) => (
                <PreviewField key={field.id} field={field} />
              ))
            )}

            {visibleFields.length > 0 && (
              <Button className="w-full" disabled>
                Submit
              </Button>
            )}
          </div>
        </ScrollArea>

        <p className="text-xs text-muted-foreground text-center pt-2 border-t">
          Submits to: {formEmail}
        </p>
      </DialogContent>
    </Dialog>
  );
}
