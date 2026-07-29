import type { ReactNode } from "react";
import ApplicationQueueRunner from "@/components/application-queue-runner";

export default function UserLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <ApplicationQueueRunner />
      {children}
    </>
  );
}
