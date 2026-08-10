import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonLine className="h-7 w-40 mb-2" />
      <SkeletonLine className="h-4 w-96 mb-8" />
      <div className="space-y-6">
        <SkeletonBlock className="h-56" />
        <SkeletonBlock className="h-64" />
      </div>
    </div>
  );
}
