import { LogOut } from "lucide-react";
import { Dashboard } from "@/components/dashboard";
import { TitleBar } from "@/components/title-bar";
import { isAdmin } from "@/lib/admin-auth";
import { AdminLogin } from "./admin-login";
import { signOut } from "./actions";

export const metadata = { title: "Admin | Freshman Flu" };

export default async function Page() {
  if (!(await isAdmin()))
    return (
      <div className="audience-page">
        <TitleBar title="Admin" />
        <main className="login-main">
          <AdminLogin />
        </main>
      </div>
    );
  return (
    <>
      <Dashboard />
      <form className="admin-signout" action={signOut}>
        <button className="button" type="submit">
          <LogOut size={14} /> Sign out
        </button>
      </form>
    </>
  );
}
