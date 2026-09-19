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
    <div className="audience-page">
      <TitleBar
        title="Admin"
        action={
          <form action={signOut}>
            <button className="button quiet" type="submit">
              Sign out
            </button>
          </form>
        }
      />
      <main />
    </div>
  );
}
