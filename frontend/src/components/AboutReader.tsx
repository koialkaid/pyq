"use client";

import { useEffect, useState } from "react";
import ArticleCommentSection from "@/components/article/ArticleCommentSection";
import ArticleEmbedContent from "@/components/article/ArticleEmbedContent";
import type { Comment } from "@/lib/mock-data";

interface AboutReaderProps {
  page: {
    id: string;
    content: string;
    comments: Comment[];
  };
}

export default function AboutReader({ page }: AboutReaderProps) {
  const [comments, setComments] = useState(page.comments || []);

  useEffect(() => {
    setComments(page.comments || []);
  }, [page.comments]);

  return (
    <article className="px-4 pb-12 pt-4 md:px-6">
      <h1 className="text-[24px] font-medium leading-tight text-wechat-text dark:text-white md:text-[28px]">
        关于
      </h1>
      <ArticleEmbedContent
        content={page.content}
        postId={page.id}
        className="article-content rich-content mt-5 text-[16px] leading-[1.8] text-wechat-text dark:text-gray-200 md:text-[18px] md:leading-[1.9]"
      />
      <div className="mt-8 border-t border-black/5 dark:border-white/10" />
      <ArticleCommentSection
        post={{ id: page.id, content: "", author: { id: "", nickname: "", avatar: "", cover: "", bio: "" }, images: [], likes: [], comments, createdAt: "" }}
        comments={comments}
        onCommentsChange={setComments}
        commentApiBase="/pages/about"
      />
    </article>
  );
}
