import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import type { FormFieldDefinition } from "@/lib/api";
import { generateHtmlCode, type OutputFormat } from "./code-templates";

interface EmbedCodeGeneratorProps {
  open: boolean;
  onClose: () => void;
  fields: FormFieldDefinition[];
  formActionUrl: string;
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-8"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 mr-1" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </>
        )}
      </Button>
      <ScrollArea className="h-[400px] w-full rounded-md border bg-muted/50">
        <pre className="p-4 text-sm">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </ScrollArea>
    </div>
  );
}

export function EmbedCodeGenerator({
  open,
  onClose,
  fields,
  formActionUrl,
}: EmbedCodeGeneratorProps) {
  const [format, setFormat] = useState<OutputFormat>("html");

  const htmlCode = generateHtmlCode(fields, formActionUrl, "html");
  const styledCode = generateHtmlCode(fields, formActionUrl, "styled");
  const reactCode = generateHtmlCode(fields, formActionUrl, "react");

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Embed Code</DialogTitle>
        </DialogHeader>

        {fields.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No fields to generate. Add some fields first.
          </p>
        ) : (
          <Tabs
            value={format}
            onValueChange={(v) => setFormat(v as OutputFormat)}
          >
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="html">Plain HTML</TabsTrigger>
              <TabsTrigger value="styled">Styled HTML</TabsTrigger>
              <TabsTrigger value="react">React</TabsTrigger>
            </TabsList>

            <TabsContent value="html" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                Basic HTML without styling. Add your own CSS.
              </p>
              <CodeBlock code={htmlCode} language="html" />
            </TabsContent>

            <TabsContent value="styled" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                HTML with inline styles. Works anywhere.
              </p>
              <CodeBlock code={styledCode} language="html" />
            </TabsContent>

            <TabsContent value="react" className="mt-4">
              <p className="text-sm text-muted-foreground mb-3">
                React component with inline styles.
              </p>
              <CodeBlock code={reactCode} language="tsx" />
            </TabsContent>
          </Tabs>
        )}

        <div className="flex items-center justify-between pt-2 border-t text-sm">
          <span className="text-muted-foreground">
            Form action: <code className="text-xs">{formActionUrl}</code>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
