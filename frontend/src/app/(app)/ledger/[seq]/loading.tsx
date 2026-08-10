import { SkeletonBlock, SkeletonLine } from "@/components/Skeleton";

export default function Loading() {
  return (
    <div>
      <SkeletonLine className="h-7 w-40 mb-2" />
      <SkeletonLine className="h-4 w-32 mb-8" />
      <SkeletonBlock className="h-64" />
    </div>
  );
}
