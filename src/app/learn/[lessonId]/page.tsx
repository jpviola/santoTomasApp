import type { Metadata } from "next";
import { notFound } from "next/navigation";
import LessonView from "@/components/learn/LessonView";
import { findLesson, getLessonIds } from "@/lib/learning/curriculum";

type LessonPageProps = { params: Promise<{ lessonId: string }> };

export function generateStaticParams() {
  return getLessonIds().map((lessonId) => ({ lessonId }));
}

export async function generateMetadata({ params }: LessonPageProps): Promise<Metadata> {
  const { lessonId } = await params;
  const location = findLesson(lessonId, "es");
  return location ? { title: `${location.lesson.title} · StoTomas AI`, description: location.lesson.summary } : {};
}

export default async function LessonPage({ params }: LessonPageProps) {
  const { lessonId } = await params;
  if (!findLesson(lessonId, "es")) notFound();
  return <LessonView lessonId={lessonId} />;
}
