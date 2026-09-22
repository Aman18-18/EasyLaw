import { redirect } from "next/navigation";

export default function Home() {
  redirect("/module1/dashboard");
}