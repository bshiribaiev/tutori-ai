type Props = { html: string };

// Agent-authored SVG (not user-supplied). Rendered via dangerouslySetInnerHTML
// because the LLM output includes element/attribute markup that would otherwise
// require a full SVG parser. Trust boundary: the EL agent's prompt is locked
// to our instructions, so script elements can't be injected through normal use.
export function SvgRenderer({ html }: Props) {
  return (
    <div
      className="w-full flex items-center justify-center [&>svg]:max-w-full [&>svg]:h-auto [&>svg]:max-h-[60vh]"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
