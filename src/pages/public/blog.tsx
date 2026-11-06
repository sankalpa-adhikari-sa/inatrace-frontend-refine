import { FileText, Image } from "lucide-react";
import { useParams } from "react-router";
import { PageLoader } from "@/components/app/page";
import { RichHtml } from "@/components/app/rich-html";
import { documentUrl } from "@/lib/api";
import { ep } from "@/lib/endpoints";
import { useApi } from "@/lib/http";
import { Article } from "./layout";
import { useTranslate } from "@refinedev/core";

const externalLink = (link: string) => (/^https?:\/\//.test(link) ? link : `http://${link}`);

/**
 * `/blog/:productId/:type/:knowledgeBlogId` (KnowledgeBlogFrontComponent).
 * Uses the public endpoint so it also works for visitors who aren't logged in.
 */
export function PublicBlogPage() {
  const translate = useTranslate();
  const id = Number(useParams().knowledgeBlogId);
  const { data: blog, isLoading } = useApi(ep.getPublicProductKnowledgeBlog, { path: { id } });

  if (isLoading) return <PageLoader />;
  if (!blog)
    return (
      <Article>
        <p>{translate("public.texts.thisArticleIsNotAvailable")}</p>
      </Article>
    );

  return (
    <Article>
      <h2>{blog.title}</h2>
      {blog.summary && <RichHtml html={blog.summary} className="mb-6 border-b pb-6 font-medium text-foreground" />}
      {blog.content && <RichHtml html={blog.content} className="mb-6 border-b pb-6" />}
      {blog.documents && blog.documents.length > 0 && (
        <ul className="mb-6 flex list-none! flex-col gap-2 border-b pb-6 pl-0!">
          {blog.documents
            .filter((d) => d.storageKey)
            .map((d) => (
              <li key={d.storageKey} className="flex items-center gap-2">
                {d.contentType === "application/pdf" ? <FileText className="size-4" /> : <Image className="size-4" />}
                <a href={documentUrl(d.storageKey, true)} target="_blank" rel="noreferrer">
                  {d.name}
                </a>
              </li>
            ))}
        </ul>
      )}
      {blog.youtubeUrl && (
        <p>
          <a href={externalLink(blog.youtubeUrl)} target="_blank" rel="noreferrer">
            {blog.youtubeUrl}
          </a>
        </p>
      )}
      {blog.date && <p className="text-xs">{blog.date}</p>}
    </Article>
  );
}
