import { useCallback, useEffect, useRef, useState, type CSSProperties, type MouseEvent } from "react";
import { createPortal } from "react-dom";
import type { PublishedBodyBlock } from "@catalyst/schemas";
import { Icon, SensitiveImage, useSensitiveHidden } from "~/components/ui";
import { safeMediaSrc } from "~/lib/entry-blocks";
import { figureId, isZoomable, splitCaption, zoomLabel } from "~/lib/figures";
import { cn } from "~/lib/utils";

type ImageBlock = Extract<PublishedBodyBlock, { type: "image" }>;

/** `Fig. 2` in bold mono, the caption, its credit in the muted tone: one paragraph of small type, as long as the picture is wide (never past ~60 characters). */
function Caption({ block, number, className }: { block: ImageBlock; number: number | undefined; className?: string }) {
  if (!block.caption) return null;
  const { text, credit } = splitCaption(block.caption);
  return (
    <figcaption data-slot="entry-caption" className={cn("entry-caption", className)}>
      {number !== undefined && <span className="entry-caption-label">Fig. {number}</span>}
      {number !== undefined && " "}
      <span className="entry-caption-text">{text}</span>
      {credit && (
        <>
          {" "}
          <span data-slot="entry-credit" className="entry-caption-credit">
            {credit}
          </span>
        </>
      )}
    </figcaption>
  );
}

/**
 * An image of an article or a project, in the flow of the text (docs/design-system.md, "Figures"): where the author put it, between
 * two blocks, under a hairline of the ink, as wide as the text or a little wider (CSS, `.entry-fig`, app.css) and never wider than the
 * picture itself (`--fig-natural`: its `width` as published, in CSS pixels). With a caption it is "Fig. N": the element carries the id
 * the mentions in the text link to (`fig-N`) and takes the focus when one is followed (`tabIndex` -1). Without one it has no number
 * said and no id. When the picture is 10 % or more wider than it is drawn, a button over it opens it larger (`FigureLightbox`); the
 * button exists once hydrated and the width is measured, so the server render and a browser without scripts show the plain figure.
 */
export function FlowFigure({ block, number }: { block: ImageBlock; number?: number | undefined }) {
  const src = safeMediaSrc(block.src);
  const hidden = useSensitiveHidden();
  const imgRef = useRef<HTMLImageElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [zoomable, setZoomable] = useState(false);
  const [open, setOpen] = useState(false);
  const natural = block.width;
  useEffect(() => {
    const img = imgRef.current;
    if (!img || natural === undefined) return;
    // `clientWidth` is the layout width (a blurred picture is scaled by a transform, which would change `getBoundingClientRect`).
    const measure = () => setZoomable(isZoomable(natural, img.clientWidth));
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(img);
    return () => observer.disconnect();
  }, [natural]);
  if (!src) return null;

  const sized = natural !== undefined && block.height !== undefined;
  const labelled = number !== undefined && !!block.caption;
  const id = labelled ? figureId(number) : undefined;
  const canZoom = zoomable && !hidden;
  return (
    <figure
      id={id}
      tabIndex={id ? -1 : undefined}
      data-slot="entry-figure"
      data-flow=""
      data-sized={sized ? "" : undefined}
      data-zoomable={canZoom ? "" : undefined}
      style={sized ? ({ "--fig-natural": `${natural}px` } as CSSProperties) : undefined}
      className="entry-fig min-w-0"
    >
      <div className={cn("entry-fig-media", !sized && "aspect-4/3 overflow-hidden bg-accent")}>
        <SensitiveImage className={sized ? undefined : "size-full"}>
          <img
            ref={imgRef}
            src={src}
            alt={block.alt}
            width={block.width}
            height={block.height}
            loading="lazy"
            decoding="async"
            className={cn("block w-full", sized ? "h-auto" : "size-full object-contain")}
          />
        </SensitiveImage>
        {canZoom && (
          <button ref={triggerRef} type="button" className="entry-fig-zoom print:hidden" aria-label={zoomLabel(labelled ? number : undefined)} aria-haspopup="dialog" onClick={() => setOpen(true)} />
        )}
      </div>
      <Caption block={block} number={labelled ? number : undefined} />
      {open && (
        <FigureLightbox
          block={block}
          src={src}
          number={labelled ? number : undefined}
          onClose={() => {
            setOpen(false);
            // The browser returns the focus to the control that opened a modal dialog; this is for the one that does not.
            queueMicrotask(() => triggerRef.current?.focus({ preventScroll: true }));
          }}
        />
      )}
    </figure>
  );
}

/**
 * A figure at its own size in a native modal `<dialog>`: `showModal()` makes the rest of the page inert (the focus trap), the top layer
 * puts it over the panel and the globe, Escape and a click on the backdrop close it, focus starts on the close button and returns to
 * the figure's control. The picture is drawn at its published `width` (CSS pixels) and shrinks to the window, never beyond it; the caption
 * is under it, as wide as the picture. Rendered in a portal on `document.body` (no clipping, inert or hidden ancestor reaches it).
 * Not part of print (`print:hidden`).
 */
function FigureLightbox({ block, src, number, onClose }: { block: ImageBlock; src: string; number: number | undefined; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement | null>(null);
  // Mounted open (guarded: StrictMode runs ref callbacks twice).
  const show = useCallback((el: HTMLDialogElement | null) => {
    ref.current = el;
    if (el && !el.open) el.showModal();
  }, []);
  // Escape, the button and the backdrop all end in the dialog's own `close` event.
  useEffect(() => {
    const el = ref.current;
    el?.addEventListener("close", onClose);
    return () => el?.removeEventListener("close", onClose);
  }, [onClose]);
  const onBackdrop = (e: MouseEvent<HTMLDialogElement>) => {
    if (e.target === e.currentTarget) ref.current?.close();
  };
  if (typeof document === "undefined") return null;
  return createPortal(
    <dialog ref={show} aria-label={number !== undefined ? `Figure ${number}` : "Image"} data-slot="figure-lightbox" className="figure-lightbox print:hidden" onClick={onBackdrop}>
      <div className="figure-lightbox-body" style={{ "--fig-natural": `${block.width}px`, "--fig-aspect": block.width && block.height ? block.width / block.height : undefined } as CSSProperties}>
        <button type="button" autoFocus className="figure-lightbox-close" aria-label="Close" onClick={() => ref.current?.close()}>
          <Icon name="close" size="control" />
        </button>
        <img src={src} alt={block.alt} width={block.width} height={block.height} decoding="async" className="figure-lightbox-img" />
        <Caption block={block} number={number} className="figure-lightbox-caption" />
      </div>
    </dialog>,
    document.body,
  );
}
