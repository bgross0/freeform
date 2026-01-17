import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FIELD_TYPES, type FieldTypeInfo } from "./types";

interface PaletteItemProps {
  fieldType: FieldTypeInfo;
}

function PaletteItem({ fieldType }: PaletteItemProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${fieldType.type}`,
      data: { type: "palette", fieldType: fieldType.type },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const Icon = fieldType.icon;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className="flex items-center gap-3 px-3 py-2.5 bg-background border rounded-md cursor-grab hover:bg-accent hover:border-accent-foreground/20 transition-colors"
    >
      <Icon className="h-4 w-4 text-muted-foreground" />
      <span className="text-sm font-medium">{fieldType.label}</span>
    </div>
  );
}

export function FieldPalette() {
  return (
    <div className="w-52 border-r bg-muted/30 flex flex-col">
      <div className="p-4 border-b">
        <h3 className="font-semibold text-sm">Field Types</h3>
        <p className="text-xs text-muted-foreground mt-1">
          Drag to add fields
        </p>
      </div>
      <ScrollArea className="flex-1 p-3">
        <div className="space-y-2">
          {FIELD_TYPES.map((fieldType) => (
            <PaletteItem key={fieldType.type} fieldType={fieldType} />
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
