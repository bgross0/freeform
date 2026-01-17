import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { FieldOption } from "@/lib/api";

interface OptionsEditorProps {
  options: FieldOption[];
  onChange: (options: FieldOption[]) => void;
}

export function OptionsEditor({ options, onChange }: OptionsEditorProps) {
  const addOption = () => {
    const newIndex = options.length + 1;
    onChange([
      ...options,
      { label: `Option ${newIndex}`, value: `option_${newIndex}` },
    ]);
  };

  const updateOption = (index: number, updates: Partial<FieldOption>) => {
    const newOptions = [...options];
    newOptions[index] = { ...newOptions[index], ...updates };
    onChange(newOptions);
  };

  const removeOption = (index: number) => {
    onChange(options.filter((_, i) => i !== index));
  };

  const moveOption = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= options.length) return;

    const newOptions = [...options];
    [newOptions[fromIndex], newOptions[toIndex]] = [
      newOptions[toIndex],
      newOptions[fromIndex],
    ];
    onChange(newOptions);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Options</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          onClick={addOption}
        >
          <Plus className="h-3 w-3 mr-1" />
          Add
        </Button>
      </div>

      {options.length === 0 ? (
        <p className="text-sm text-muted-foreground py-2">
          No options yet. Click "Add" to create options.
        </p>
      ) : (
        <div className="space-y-2">
          {options.map((option, index) => (
            <div key={index} className="flex items-center gap-2">
              <div className="flex flex-col">
                <button
                  type="button"
                  className="p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  onClick={() => moveOption(index, "up")}
                  disabled={index === 0}
                >
                  <GripVertical className="h-3 w-3" />
                </button>
              </div>
              <Input
                value={option.label}
                onChange={(e) => updateOption(index, { label: e.target.value })}
                placeholder="Label"
                className="h-8 text-sm"
              />
              <Input
                value={option.value}
                onChange={(e) => updateOption(index, { value: e.target.value })}
                placeholder="Value"
                className="h-8 text-sm w-24"
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                onClick={() => removeOption(index)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
