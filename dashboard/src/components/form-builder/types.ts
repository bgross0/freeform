import type { FieldType } from "@/lib/api";
import {
  Type,
  Mail,
  Hash,
  Phone,
  AlignLeft,
  ChevronDown,
  Circle,
  CheckSquare,
  Calendar,
  Upload,
  EyeOff,
  Heading,
} from "lucide-react";

export interface FieldTypeInfo {
  type: FieldType;
  label: string;
  icon: typeof Type;
  defaultLabel: string;
  hasOptions?: boolean;
  hasPlaceholder?: boolean;
  hasValidation?: boolean;
}

export const FIELD_TYPES: FieldTypeInfo[] = [
  {
    type: "text",
    label: "Text",
    icon: Type,
    defaultLabel: "Text Field",
    hasPlaceholder: true,
    hasValidation: true,
  },
  {
    type: "email",
    label: "Email",
    icon: Mail,
    defaultLabel: "Email",
    hasPlaceholder: true,
    hasValidation: true,
  },
  {
    type: "number",
    label: "Number",
    icon: Hash,
    defaultLabel: "Number",
    hasPlaceholder: true,
    hasValidation: true,
  },
  {
    type: "phone",
    label: "Phone",
    icon: Phone,
    defaultLabel: "Phone Number",
    hasPlaceholder: true,
    hasValidation: true,
  },
  {
    type: "textarea",
    label: "Textarea",
    icon: AlignLeft,
    defaultLabel: "Message",
    hasPlaceholder: true,
    hasValidation: true,
  },
  {
    type: "select",
    label: "Dropdown",
    icon: ChevronDown,
    defaultLabel: "Select Option",
    hasOptions: true,
  },
  {
    type: "radio",
    label: "Radio",
    icon: Circle,
    defaultLabel: "Choose One",
    hasOptions: true,
  },
  {
    type: "checkbox",
    label: "Checkbox",
    icon: CheckSquare,
    defaultLabel: "Select Options",
    hasOptions: true,
  },
  {
    type: "date",
    label: "Date",
    icon: Calendar,
    defaultLabel: "Date",
    hasValidation: true,
  },
  {
    type: "file",
    label: "File",
    icon: Upload,
    defaultLabel: "Upload File",
    hasValidation: true,
  },
  {
    type: "hidden",
    label: "Hidden",
    icon: EyeOff,
    defaultLabel: "Hidden Field",
  },
  {
    type: "section",
    label: "Section",
    icon: Heading,
    defaultLabel: "Section Title",
  },
];

export function getFieldTypeInfo(type: FieldType): FieldTypeInfo | undefined {
  return FIELD_TYPES.find((f) => f.type === type);
}

export function generateFieldName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 32);
}
