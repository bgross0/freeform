import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { Loader2, ArrowLeft, Eye, Code, Save, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useForm, useUpdateForm } from "@/hooks/useForms";
import type { FormFieldDefinition, FieldType } from "@/lib/api";
import {
  FieldPalette,
  FieldCanvas,
  FieldConfigPanel,
  FormPreview,
  EmbedCodeGenerator,
  FIELD_TYPES,
  generateFieldName,
} from "@/components/form-builder";

export function FormBuilderPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const { data: form, isLoading, error } = useForm(formId!);
  const updateMutation = useUpdateForm(formId!);

  const [fields, setFields] = useState<FormFieldDefinition[]>([]);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [isDirty, setIsDirty] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [showEmbedCode, setShowEmbedCode] = useState(false);
  const [showDiscardDialog, setShowDiscardDialog] = useState(false);

  // Initialize fields from form settings
  useEffect(() => {
    if (form?.settings?.field_schema) {
      setFields(form.settings.field_schema);
      setIsDirty(false);
    }
  }, [form]);

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Generate unique ID for new fields
  const generateId = () => `field_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

  // Create a new field from a field type
  const createField = useCallback((type: FieldType): FormFieldDefinition => {
    const typeInfo = FIELD_TYPES.find((t) => t.type === type);
    const label = typeInfo?.defaultLabel || "Field";
    return {
      id: generateId(),
      type,
      name: generateFieldName(label),
      label,
      required: false,
      options: typeInfo?.hasOptions
        ? [
            { label: "Option 1", value: "option_1" },
            { label: "Option 2", value: "option_2" },
          ]
        : undefined,
    };
  }, []);

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    // Check if dragging from palette
    const activeData = active.data.current;
    if (activeData?.type === "palette") {
      // Add new field
      const newField = createField(activeData.fieldType);
      setFields((prev) => [...prev, newField]);
      setSelectedFieldId(newField.id);
      setIsDirty(true);
      return;
    }

    // Reordering existing fields
    if (active.id !== over.id) {
      setFields((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return items;
        setIsDirty(true);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  // Update a field
  const handleUpdateField = useCallback(
    (updates: Partial<FormFieldDefinition>) => {
      if (!selectedFieldId) return;
      setFields((prev) =>
        prev.map((f) =>
          f.id === selectedFieldId ? { ...f, ...updates } : f
        )
      );
      setIsDirty(true);
    },
    [selectedFieldId]
  );

  // Delete a field
  const handleDeleteField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
    if (selectedFieldId === id) {
      setSelectedFieldId(null);
    }
    setIsDirty(true);
  }, [selectedFieldId]);

  // Save changes
  const handleSave = async () => {
    try {
      await updateMutation.mutateAsync({
        settings: {
          ...form?.settings,
          field_schema: fields,
        },
      });
      setIsDirty(false);
      toast.success("Form saved successfully");
    } catch {
      toast.error("Failed to save form");
    }
  };

  // Discard changes
  const handleDiscard = () => {
    if (form?.settings?.field_schema) {
      setFields(form.settings.field_schema);
    } else {
      setFields([]);
    }
    setSelectedFieldId(null);
    setIsDirty(false);
    setShowDiscardDialog(false);
  };

  // Get selected field
  const selectedField = selectedFieldId
    ? fields.find((f) => f.id === selectedFieldId) || null
    : null;

  // Form action URL for embed code
  const formActionUrl = form
    ? `${window.location.origin.replace("/dashboard", "")}/${form.email_hash}`
    : "";

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !form) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)]">
        <p className="text-destructive mb-4">Failed to load form</p>
        <Button variant="outline" onClick={() => navigate("/")}>
          Back to Forms
        </Button>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex flex-col h-[calc(100vh-4rem)]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b bg-background">
          <div className="flex items-center gap-3">
            <Link to={`/forms/${formId}/settings`}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold">{form.name || "Untitled Form"}</h1>
              <p className="text-sm text-muted-foreground">Form Builder</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(true)}
            >
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowEmbedCode(true)}
            >
              <Code className="h-4 w-4 mr-2" />
              Get Code
            </Button>
            {isDirty && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDiscardDialog(true)}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Discard
              </Button>
            )}
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!isDirty || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>

        {/* Main content */}
        <div className="flex flex-1 overflow-hidden">
          <FieldPalette />
          <FieldCanvas
            fields={fields}
            selectedFieldId={selectedFieldId}
            onSelectField={setSelectedFieldId}
            onDeleteField={handleDeleteField}
          />
          <FieldConfigPanel
            field={selectedField}
            onUpdate={handleUpdateField}
            onDelete={() => selectedFieldId && handleDeleteField(selectedFieldId)}
          />
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeId && activeId.startsWith("palette-") && (
          <div className="px-3 py-2 bg-background border rounded-md shadow-lg">
            {FIELD_TYPES.find(
              (t) => t.type === activeId.replace("palette-", "")
            )?.label}
          </div>
        )}
      </DragOverlay>

      {/* Preview dialog */}
      <FormPreview
        open={showPreview}
        onClose={() => setShowPreview(false)}
        fields={fields}
        formEmail={form.email}
      />

      {/* Embed code dialog */}
      <EmbedCodeGenerator
        open={showEmbedCode}
        onClose={() => setShowEmbedCode(false)}
        fields={fields}
        formActionUrl={formActionUrl}
      />

      {/* Discard confirmation dialog */}
      <Dialog open={showDiscardDialog} onOpenChange={setShowDiscardDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Discard changes?</DialogTitle>
            <DialogDescription>
              You have unsaved changes. Are you sure you want to discard them?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDiscardDialog(false)}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDiscard}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DndContext>
  );
}
