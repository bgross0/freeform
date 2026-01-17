import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, Settings2 } from "lucide-react";
import type { FormFieldDefinition } from "@/lib/api";
import { getFieldTypeInfo, generateFieldName } from "./types";
import { OptionsEditor } from "./OptionsEditor";

interface FieldConfigPanelProps {
  field: FormFieldDefinition | null;
  onUpdate: (updates: Partial<FormFieldDefinition>) => void;
  onDelete: () => void;
}

export function FieldConfigPanel({
  field,
  onUpdate,
  onDelete,
}: FieldConfigPanelProps) {
  if (!field) {
    return (
      <div className="w-80 border-l bg-muted/30 flex flex-col items-center justify-center p-6 text-center">
        <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
          <Settings2 className="h-6 w-6 text-muted-foreground" />
        </div>
        <h3 className="font-medium text-foreground mb-1">No field selected</h3>
        <p className="text-sm text-muted-foreground">
          Click on a field in the canvas to edit its properties
        </p>
      </div>
    );
  }

  const typeInfo = getFieldTypeInfo(field.type);
  const Icon = typeInfo?.icon;

  const handleLabelChange = (label: string) => {
    const updates: Partial<FormFieldDefinition> = { label };
    // Auto-generate name if it matches the previous auto-generated value
    const previousAutoName = generateFieldName(field.label);
    if (field.name === previousAutoName || !field.name) {
      updates.name = generateFieldName(label);
    }
    onUpdate(updates);
  };

  return (
    <div className="w-80 border-l bg-muted/30 flex flex-col">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <h3 className="font-semibold text-sm">{typeInfo?.label} Settings</h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Label */}
          <div className="space-y-2">
            <Label htmlFor="field-label">Label</Label>
            <Input
              id="field-label"
              value={field.label}
              onChange={(e) => handleLabelChange(e.target.value)}
              placeholder="Field label"
            />
          </div>

          {/* Name (HTML name attribute) */}
          <div className="space-y-2">
            <Label htmlFor="field-name">
              Field Name
              <span className="text-xs text-muted-foreground ml-1">(HTML)</span>
            </Label>
            <Input
              id="field-name"
              value={field.name}
              onChange={(e) => onUpdate({ name: e.target.value })}
              placeholder="field_name"
              className="font-mono text-sm"
            />
          </div>

          {/* Required toggle (not for section/hidden) */}
          {field.type !== "section" && field.type !== "hidden" && (
            <div className="flex items-center justify-between">
              <Label htmlFor="field-required">Required</Label>
              <Switch
                id="field-required"
                checked={field.required || false}
                onCheckedChange={(checked) => onUpdate({ required: checked })}
              />
            </div>
          )}

          {/* Placeholder (for text-like fields) */}
          {typeInfo?.hasPlaceholder && (
            <div className="space-y-2">
              <Label htmlFor="field-placeholder">Placeholder</Label>
              <Input
                id="field-placeholder"
                value={field.placeholder || ""}
                onChange={(e) => onUpdate({ placeholder: e.target.value })}
                placeholder="Placeholder text"
              />
            </div>
          )}

          {/* Default value (not for section) */}
          {field.type !== "section" && (
            <div className="space-y-2">
              <Label htmlFor="field-default">Default Value</Label>
              <Input
                id="field-default"
                value={field.defaultValue || ""}
                onChange={(e) => onUpdate({ defaultValue: e.target.value })}
                placeholder="Default value"
              />
            </div>
          )}

          {/* Help text (not for hidden) */}
          {field.type !== "hidden" && (
            <div className="space-y-2">
              <Label htmlFor="field-help">Help Text</Label>
              <Input
                id="field-help"
                value={field.helpText || ""}
                onChange={(e) => onUpdate({ helpText: e.target.value })}
                placeholder="Help text shown below field"
              />
            </div>
          )}

          {/* Section content (for section type) */}
          {field.type === "section" && (
            <div className="space-y-2">
              <Label htmlFor="field-section-content">Description</Label>
              <Textarea
                id="field-section-content"
                value={field.sectionContent || ""}
                onChange={(e) => onUpdate({ sectionContent: e.target.value })}
                placeholder="Section description or instructions"
                rows={3}
              />
            </div>
          )}

          {/* Options (for select/radio/checkbox) */}
          {typeInfo?.hasOptions && (
            <>
              <Separator />
              <OptionsEditor
                options={field.options || []}
                onChange={(options) => onUpdate({ options })}
              />
            </>
          )}

          {/* Validation rules */}
          {typeInfo?.hasValidation && (
            <>
              <Separator />
              <div className="space-y-3">
                <h4 className="text-sm font-medium">Validation</h4>

                {(field.type === "text" ||
                  field.type === "textarea" ||
                  field.type === "phone") && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="val-min" className="text-xs">
                        Min Length
                      </Label>
                      <Input
                        id="val-min"
                        type="number"
                        value={field.validation?.min ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              min: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="val-max" className="text-xs">
                        Max Length
                      </Label>
                      <Input
                        id="val-max"
                        type="number"
                        value={field.validation?.max ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              max: e.target.value
                                ? parseInt(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                {field.type === "number" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label htmlFor="val-min" className="text-xs">
                        Min Value
                      </Label>
                      <Input
                        id="val-min"
                        type="number"
                        value={field.validation?.min ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              min: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="val-max" className="text-xs">
                        Max Value
                      </Label>
                      <Input
                        id="val-max"
                        type="number"
                        value={field.validation?.max ?? ""}
                        onChange={(e) =>
                          onUpdate({
                            validation: {
                              ...field.validation,
                              max: e.target.value
                                ? parseFloat(e.target.value)
                                : undefined,
                            },
                          })
                        }
                        className="h-8"
                      />
                    </div>
                  </div>
                )}

                {field.type === "file" && (
                  <div className="space-y-2">
                    <Label htmlFor="val-accept" className="text-xs">
                      Accepted File Types
                    </Label>
                    <Input
                      id="val-accept"
                      value={field.validation?.accept || ""}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            accept: e.target.value || undefined,
                          },
                        })
                      }
                      placeholder="image/*,.pdf,.doc"
                      className="h-8 text-sm"
                    />
                    <p className="text-xs text-muted-foreground">
                      Comma-separated mime types or extensions
                    </p>
                  </div>
                )}

                {(field.type === "text" ||
                  field.type === "phone" ||
                  field.type === "email") && (
                  <div className="space-y-2">
                    <Label htmlFor="val-pattern" className="text-xs">
                      Pattern (Regex)
                    </Label>
                    <Input
                      id="val-pattern"
                      value={field.validation?.pattern || ""}
                      onChange={(e) =>
                        onUpdate({
                          validation: {
                            ...field.validation,
                            pattern: e.target.value || undefined,
                          },
                        })
                      }
                      placeholder="^[A-Za-z]+$"
                      className="h-8 font-mono text-sm"
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
