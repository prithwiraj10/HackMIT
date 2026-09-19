import { TitleBar } from "@/components/title-bar";

export const metadata = { title: "Students | Freshman Flu" };

export default function Page() {
  return (
    <div className="audience-page">
      <TitleBar title="Students" />
      <main />
    </div>
  );
}
