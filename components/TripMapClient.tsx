"use client";

import dynamic from "next/dynamic";

const TripMap = dynamic(() => import("./TripMap"), {
  ssr: false,
  loading: () => (
    <div className="h-full w-full animate-pulse bg-[var(--bg-alt)]" />
  ),
});

export default TripMap;
