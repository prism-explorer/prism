import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonLine className="h-7 w-40 mb-2" />
      <SkeletonLine className="h-4 w-96 mb-8" />
      <div className="space-y-8">
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-40" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
        <SkeletonBlock className="h-32" />
      </div>
    </div>
  );
}
