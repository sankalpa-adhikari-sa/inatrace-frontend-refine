import { useTranslate } from "@refinedev/core";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { ApiCompanyDocument } from "@/client/types.gen";
import { StoredImage } from "@/components/app/stored-image";
import { Button } from "@/components/ui/button";
import { useB2c } from "./context";
import { B2cMain } from "./layout";

const youtubeEmbed = (link: string) => link.replace("youtu.be", "youtube.com/embed").replace("watch?v=", "embed/");

/** `producers` (B2cProducersComponent) */
export function B2cProducers() {
  const translate = useTranslate();
  const { label } = useB2c();
  const video = label.videoMeetTheFarmers?.link;
  return (
    <B2cMain title={translate("b2c.titles.meetTheFarmers")}>
      {video && (
        <iframe
          src={youtubeEmbed(video)}
          title={translate("b2c.titles.meetTheFarmers")}
          className="aspect-video w-full rounded"
          allowFullScreen
        />
      )}
      <Carousel slides={label.photosMeetTheFarmers} />
      {!!label.productionRecords?.length && (
        <>
          <h2 className="mt-4 text-xl font-semibold">
            {translate("b2c.titles.meetTheProducerOrganization")}
          </h2>
          <Carousel slides={label.productionRecords} records />
        </>
      )}
    </B2cMain>
  );
}

/** Image slides of company documents (B2cCarouselComponent). */
function Carousel({ slides, records }: { slides?: ApiCompanyDocument[]; records?: boolean }) {
  const translate = useTranslate();
  const [i, setI] = useState(0);
  if (!slides?.length) return null;
  const slide = slides[i % slides.length];
  const step = (d: number) => setI((i + d + slides.length) % slides.length);
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {slides.length > 1 && (
          <Button variant="ghost" size="icon" aria-label={translate("buttons.previous")} onClick={() => step(-1)}>
            <ChevronLeft />
          </Button>
        )}
        <div className="flex flex-1 justify-center">
          {slide.document?.storageKey && (
            <StoredImage
              key={slide.document.storageKey}
              storageKey={slide.document.storageKey}
              size="MEDIUM"
              isPublic
              alt={slide.name ?? ""}
              className="max-h-96 rounded"
            />
          )}
        </div>
        {slides.length > 1 && (
          <Button
            variant="ghost"
            size="icon"
            aria-label={translate("buttons.next")}
            onClick={() => step(1)}
          >
            <ChevronRight />
          </Button>
        )}
      </div>
      {!records && slide.name && <h2 className="text-lg font-semibold">{slide.name}</h2>}
      {slide.description && <p>{slide.description}</p>}
      {!records && slide.quote && <blockquote className="border-l-2 pl-3 italic">{slide.quote}</blockquote>}
    </div>
  );
}
