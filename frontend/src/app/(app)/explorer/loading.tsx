import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <div className="text-center py-12">
        <SkeletonLine className="h-10 w-40 mx-auto mb-3" />
        <SkeletonLine className="h-4 w-72 mx-auto mb-8" />
        <SkeletonLine className="h-10 w-full max-w-xl mx-auto" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-20" />
        ))}
      </div>
      <div className="mt-10 space-y-2">
        {Array.from({ length: 5 }).map((_, i) => (
          <SkeletonBlock key={i} className="h-14" />
        ))}
      </div>
    </div>
  );
}
