import Link from "@tiptap/extension-link";
import { EditorContent, type Editor, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Bold, Heading2, Italic, Link2, List, ListOrdered, Quote, Redo, Undo } from "lucide-react";
import { type ReactNode, useEffect, useRef } from "react";
import { type Control, type FieldPath, type FieldValues, type RegisterOptions, useController } from "react-hook-form";
import { Field, FieldDescription, FieldError } from "@/components/ui/field";
import { FormFieldLabel } from "./form-fields";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/utils";
import { useTranslate } from "@refinedev/core";

export function RichTextField<T extends FieldValues>({
  control,
  name,
  label,
  description,
  rules,
  required,
  disabled,
  className,
}: {
  control: Control<T>;
  name: FieldPath<T>;
  label?: ReactNode;
  description?: ReactNode;
  rules?: RegisterOptions<T, FieldPath<T>>;
  /** Show the required asterisk; defaults to whether `rules.required` is set. */
  required?: boolean;
  disabled?: boolean;
  className?: string;
}) {
  const { field, fieldState } = useController({ control, name, rules, disabled });
  const valueRef = useRef(field.value);
  valueRef.current = field.value;
  const editor = useEditor({
    extensions: [StarterKit, Link.configure({ openOnClick: false })],
    content: (field.value as string) ?? "",
    editable: !field.disabled,
    onUpdate: ({ editor }) => {
      const html = editor.isEmpty ? "" : editor.getHTML();
      // Skip no-op updates so they don't mark the field dirty (a dirty field
      // keeps its value when the form is reset with loaded data).
      if (html !== ((valueRef.current as string) ?? "")) field.onChange(html);
    },
    onBlur: () => field.onBlur(),
    editorProps: {
      attributes: {
        class:
          "prose prose-sm max-w-none min-h-28 px-2.5 py-2 text-xs/relaxed outline-none [&_a]:underline [&_ol]:list-decimal [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:pl-5 [&_h2]:text-sm [&_h2]:font-semibold [&_blockquote]:border-l-2 [&_blockquote]:pl-3",
      },
    },
  });

  // Follow external value changes (e.g. the form is reset with loaded data).
  useEffect(() => {
    if (!editor) return;
    const value = (field.value as string) ?? "";
    if (value !== editor.getHTML() && !(value === "" && editor.isEmpty)) {
      editor.commands.setContent(value, false);
    }
  }, [editor, field.value]);

  useEffect(() => {
    // TipTap emits an update on setEditable unless told not to.
    editor?.setEditable(!field.disabled, false);
  }, [editor, field.disabled]);

  return (
    <Field className={className} data-invalid={!!fieldState.error || undefined}>
      {label && <FormFieldLabel required={required ?? rules?.required}>{label}</FormFieldLabel>}
      <div
        className={cn(
          "rounded-md border border-input bg-input/20 dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30",
          field.disabled && "opacity-60"
        )}
      >
        {editor && !field.disabled && <Toolbar editor={editor} />}
        <EditorContent editor={editor} />
      </div>
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={[fieldState.error]} />
    </Field>
  );
}

function Toolbar({ editor }: { editor: Editor }) {
  const translate = useTranslate();
  const btn = (pressed: boolean, onClick: () => void, icon: ReactNode, label: string) => (
    <Toggle size="sm" pressed={pressed} onPressedChange={onClick} aria-label={label} title={label}>
      {icon}
    </Toggle>
  );
  const chain = () => editor.chain().focus();
  return (
    <div className="flex flex-wrap gap-0.5 border-b p-1">
      {btn(editor.isActive("bold"), () => chain().toggleBold().run(), <Bold />, translate("buttons.bold"))}
      {btn(editor.isActive("italic"), () => chain().toggleItalic().run(), <Italic />, translate("buttons.italic"))}
      {btn(
        editor.isActive("heading", { level: 2 }),
        () => chain().toggleHeading({ level: 2 }).run(),
        <Heading2 />,
        translate("buttons.heading")
      )}
      {btn(editor.isActive("bulletList"), () => chain().toggleBulletList().run(), <List />, translate("buttons.bulletList"))}
      {btn(editor.isActive("orderedList"), () => chain().toggleOrderedList().run(), <ListOrdered />, translate("buttons.numberedList"))}
      {btn(editor.isActive("blockquote"), () => chain().toggleBlockquote().run(), <Quote />, translate("common.fields.quote"))}
      {btn(
        editor.isActive("link"),
        () => {
          if (editor.isActive("link")) return chain().unsetLink().run();
          const href = window.prompt(translate("common.fields.linkUrl"));
          if (href) chain().setLink({ href }).run();
        },
        <Link2 />,
        translate("common.fields.link")
      )}
      {btn(false, () => chain().undo().run(), <Undo />, translate("buttons.undo"))}
      {btn(false, () => chain().redo().run(), <Redo />, translate("buttons.redo"))}
    </div>
  );
}
