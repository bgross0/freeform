import type { FormFieldDefinition } from "@/lib/api";

export type OutputFormat = "html" | "styled" | "react";

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function generateFieldHtml(
  field: FormFieldDefinition,
  styled: boolean
): string {
  const id = field.name;
  const requiredAttr = field.required ? " required" : "";
  const placeholderAttr = field.placeholder
    ? ` placeholder="${escapeHtml(field.placeholder)}"`
    : "";
  const defaultValueAttr = field.defaultValue
    ? ` value="${escapeHtml(field.defaultValue)}"`
    : "";

  const labelStyle = styled
    ? ' style="display: block; margin-bottom: 4px; font-weight: 500;"'
    : "";
  const inputStyle = styled
    ? ' style="width: 100%; padding: 8px 12px; border: 1px solid #d1d5db; border-radius: 6px; font-size: 14px;"'
    : "";
  const fieldWrapStyle = styled
    ? ' style="margin-bottom: 16px;"'
    : "";
  const helpStyle = styled
    ? ' style="font-size: 12px; color: #6b7280; margin-top: 4px;"'
    : "";

  const labelText = `${escapeHtml(field.label)}${field.required ? " *" : ""}`;
  const helpText = field.helpText
    ? `\n    <p${helpStyle}>${escapeHtml(field.helpText)}</p>`
    : "";

  switch (field.type) {
    case "text":
    case "email":
    case "phone":
    case "number":
    case "date": {
      const inputType =
        field.type === "phone" ? "tel" : field.type === "text" ? "text" : field.type;
      return `  <div${fieldWrapStyle}>
    <label for="${id}"${labelStyle}>${labelText}</label>
    <input type="${inputType}" id="${id}" name="${id}"${placeholderAttr}${defaultValueAttr}${requiredAttr}${inputStyle}>${helpText}
  </div>`;
    }

    case "textarea":
      return `  <div${fieldWrapStyle}>
    <label for="${id}"${labelStyle}>${labelText}</label>
    <textarea id="${id}" name="${id}"${placeholderAttr}${requiredAttr}${inputStyle} rows="4">${field.defaultValue ? escapeHtml(field.defaultValue) : ""}</textarea>${helpText}
  </div>`;

    case "select":
      const options = (field.options || [])
        .map(
          (opt) =>
            `      <option value="${escapeHtml(opt.value)}">${escapeHtml(opt.label)}</option>`
        )
        .join("\n");
      return `  <div${fieldWrapStyle}>
    <label for="${id}"${labelStyle}>${labelText}</label>
    <select id="${id}" name="${id}"${requiredAttr}${inputStyle}>
      <option value="">Select...</option>
${options}
    </select>${helpText}
  </div>`;

    case "radio":
      const radioOptions = (field.options || [])
        .map(
          (opt, i) =>
            `    <label${styled ? ' style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"' : ""}>
      <input type="radio" name="${id}" value="${escapeHtml(opt.value)}"${i === 0 && field.required ? " required" : ""}>
      ${escapeHtml(opt.label)}
    </label>`
        )
        .join("\n");
      return `  <fieldset${fieldWrapStyle}${styled ? ' style="border: none; padding: 0; margin: 0;"' : ""}>
    <legend${labelStyle}>${labelText}</legend>
${radioOptions}${helpText}
  </fieldset>`;

    case "checkbox":
      if (field.options && field.options.length > 0) {
        const checkboxOptions = field.options
          .map(
            (opt) =>
              `    <label${styled ? ' style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;"' : ""}>
      <input type="checkbox" name="${id}[]" value="${escapeHtml(opt.value)}">
      ${escapeHtml(opt.label)}
    </label>`
          )
          .join("\n");
        return `  <fieldset${fieldWrapStyle}${styled ? ' style="border: none; padding: 0; margin: 0;"' : ""}>
    <legend${labelStyle}>${labelText}</legend>
${checkboxOptions}${helpText}
  </fieldset>`;
      }
      return `  <div${fieldWrapStyle}>
    <label${styled ? ' style="display: flex; align-items: center; gap: 8px;"' : ""}>
      <input type="checkbox" name="${id}"${requiredAttr}>
      ${labelText}
    </label>${helpText}
  </div>`;

    case "file":
      const acceptAttr = field.validation?.accept
        ? ` accept="${escapeHtml(field.validation.accept)}"`
        : "";
      return `  <div${fieldWrapStyle}>
    <label for="${id}"${labelStyle}>${labelText}</label>
    <input type="file" id="${id}" name="${id}"${acceptAttr}${requiredAttr}${inputStyle}>${helpText}
  </div>`;

    case "hidden":
      return `  <input type="hidden" name="${id}"${defaultValueAttr}>`;

    case "section":
      return `  <div${styled ? ' style="margin: 24px 0 16px; padding-top: 16px; border-top: 1px solid #e5e7eb;"' : ""}>
    <h3${styled ? ' style="font-size: 18px; font-weight: 600; margin: 0 0 8px;"' : ""}>${escapeHtml(field.label)}</h3>${field.sectionContent ? `\n    <p${styled ? ' style="color: #6b7280; margin: 0;"' : ""}>${escapeHtml(field.sectionContent)}</p>` : ""}
  </div>`;

    default:
      return "";
  }
}

export function generateHtmlCode(
  fields: FormFieldDefinition[],
  formActionUrl: string,
  format: OutputFormat
): string {
  const styled = format === "styled";
  const isReact = format === "react";

  const fieldHtml = fields.map((f) => generateFieldHtml(f, styled)).join("\n\n");

  const formStyle = styled
    ? ' style="max-width: 480px; margin: 0 auto; padding: 24px;"'
    : "";
  const buttonStyle = styled
    ? ' style="background: #2563eb; color: white; padding: 10px 20px; border: none; border-radius: 6px; font-size: 14px; cursor: pointer;"'
    : "";

  if (isReact) {
    const reactFields = fields
      .map((f) => generateFieldHtml(f, true))
      .join("\n\n")
      .replace(/class=/g, "className=")
      .replace(/for=/g, "htmlFor=");

    return `export default function ContactForm() {
  return (
    <form action="${formActionUrl}" method="POST" style={{ maxWidth: 480, margin: "0 auto", padding: 24 }}>
${reactFields}

      <button type="submit" style={{ background: "#2563eb", color: "white", padding: "10px 20px", border: "none", borderRadius: 6, fontSize: 14, cursor: "pointer" }}>
        Submit
      </button>
    </form>
  );
}`;
  }

  return `<form action="${formActionUrl}" method="POST"${formStyle}>
${fieldHtml}

  <button type="submit"${buttonStyle}>Submit</button>
</form>`;
}
