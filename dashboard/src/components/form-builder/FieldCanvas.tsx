import {
  SortableContext,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FieldCard } from "./FieldCard";
import type { FormFieldDefinition } from "@/lib/api";
import { Plus, MousePointer2 } from "lucide-react";

interface FieldCanvasProps {
  fields: FormFieldDefinition[];
  selectedFieldId: string | null;
  onSelectField: (id: string | null) => void;
  onDeleteField: (id: string) => void;
}

export function FieldCanvas({
  fields,
  selectedFieldId,
  onSelectField,
  onDeleteField,
}: FieldCanvasProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: "canvas",
  });

  return (
    <div className="flex-1 flex flex-col bg-muted/20">
      <ScrollArea className="flex-1">
        <div
          ref={setNodeRef}
          className="p-6 min-h-full"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              onSelectField(null);
            }
          }}
        >
          {fields.length === 0 ? (
            <div
              className={`border-2 border-dashed rounded-lg p-12 flex flex-col items-center justify-center text-center transition-colors ${
                isOver
                  ? "border-primary bg-primary/5"
                  : "border-muted-foreground/25"
              }`}
            >
              <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
                {isOver ? (
                  <Plus className="h-6 w-6 text-primary" />
                ) : (
                  <MousePointer2 className="h-6 w-6 text-muted-foreground" />
                )}
              </div>
              <h3 className="font-medium text-foreground mb-1">
                {isOver ? "Drop to add field" : "No fields yet"}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                Drag field types from the left panel to start building your form
              </p>
            </div>
          ) : (
            <SortableContext
              items={fields.map((f) => f.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3 max-w-2xl mx-auto">
                {fields.map((field) => (
                  <FieldCard
                    key={field.id}
                    field={field}
                    isSelected={selectedFieldId === field.id}
                    onSelect={() => onSelectField(field.id)}
                    onDelete={() => onDeleteField(field.id)}
                  />
                ))}
                {isOver && (
                  <div className="border-2 border-dashed border-primary rounded-lg p-4 flex items-center justify-center text-primary bg-primary/5">
                    <Plus className="h-5 w-5 mr-2" />
                    <span className="text-sm font-medium">Drop here to add</span>
                  </div>
                )}
              </div>
            </SortableContext>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
