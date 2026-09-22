import Sidebar from "@/components/shared/Sidebar";

export default function LawyerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#f5f5f0]">
        {children}
      </main>
    </div>
  );
}