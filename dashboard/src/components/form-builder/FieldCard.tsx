import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FormFieldDefinition } from "@/lib/api";
import { getFieldTypeInfo } from "./types";
import { cn } from "@/lib/utils";

interface FieldCardProps {
  field: FormFieldDefinition;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
}

export function FieldCard({
  field,
  isSelected,
  onSelect,
  onDelete,
}: FieldCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const typeInfo = getFieldTypeInfo(field.type);
  const Icon = typeInfo?.icon;

  const renderFieldPreview = () => {
    switch (field.type) {
      case "text":
      case "email":
      case "phone":
      case "number":
      case "date":
        return (
          <div className="h-9 bg-muted/50 border rounded-md flex items-center px-3 text-sm text-muted-foreground">
            {field.placeholder || `Enter ${field.type}...`}
          </div>
        );
      case "textarea":
        return (
          <div className="h-20 bg-muted/50 border rounded-md flex items-start p-3 text-sm text-muted-foreground">
            {field.placeholder || "Enter text..."}
          </div>
        );
      case "select":
        return (
          <div className="h-9 bg-muted/50 border rounded-md flex items-center justify-between px-3 text-sm text-muted-foreground">
            <span>Select...</span>
            <span className="text-xs">▼</span>
          </div>
        );
      case "radio":
        return (
          <div className="space-y-1.5">
            {(field.options?.slice(0, 3) || [{ label: "Option 1", value: "" }]).map(
              (opt, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                  <span className="text-muted-foreground">{opt.label}</span>
                </div>
              )
            )}
            {(field.options?.length || 0) > 3 && (
              <div className="text-xs text-muted-foreground">
                +{(field.options?.length || 0) - 3} more
              </div>
            )}
          </div>
        );
      case "checkbox":
        if (field.options && field.options.length > 0) {
          return (
            <div className="space-y-1.5">
              {field.options.slice(0, 3).map((opt, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <div className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
                  <span className="text-muted-foreground">{opt.label}</span>
                </div>
              ))}
              {field.options.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{field.options.length - 3} more
                </div>
              )}
            </div>
          );
        }
        return (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-4 w-4 rounded border-2 border-muted-foreground/30" />
            <span className="text-muted-foreground">{field.label}</span>
          </div>
        );
      case "file":
        return (
          <div className="h-9 bg-muted/50 border border-dashed rounded-md flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <span>Choose file...</span>
          </div>
        );
      case "hidden":
        return (
          <div className="h-9 bg-muted/30 border border-dashed rounded-md flex items-center px-3 text-sm text-muted-foreground italic">
            Hidden: {field.name}
            {field.defaultValue && ` = "${field.defaultValue}"`}
          </div>
        );
      case "section":
        return (
          <div className="border-t pt-2">
            {field.sectionContent && (
              <p className="text-sm text-muted-foreground">
                {field.sectionContent}
              </p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group relative bg-background border rounded-lg p-4 transition-all",
        isSelected && "ring-2 ring-primary border-primary",
        isDragging && "opacity-50 shadow-lg"
      )}
      onClick={onSelect}
    >
      <div className="flex items-start gap-3">
        <button
          className="mt-0.5 cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>

        <div className="flex-1 min-w-0">
          {field.type !== "hidden" && field.type !== "section" && (
            <div className="flex items-center gap-2 mb-2">
              {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
              <label className="text-sm font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </label>
            </div>
          )}
          {field.type === "section" && (
            <h4 className="text-base font-semibold mb-1">{field.label}</h4>
          )}
          {renderFieldPreview()}
          {field.helpText && field.type !== "section" && (
            <p className="text-xs text-muted-foreground mt-1.5">{field.helpText}</p>
          )}
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
