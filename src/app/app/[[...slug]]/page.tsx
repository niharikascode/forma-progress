import { redirect } from "next/navigation";
import { getDatabase, readWorkspace } from "@/lib/database";
import { currentAccount } from "@/lib/auth";
import WorkspaceApp from "@/components/workspace";
export const dynamic = "force-dynamic";
export default async function Page() {
  const account = await currentAccount();
  if (!account) redirect("/login");
  return (
    <WorkspaceApp
      initial={await readWorkspace(await getDatabase(), account.userId)}
      account={{ name: account.name, email: account.email }}
    />
  );
}
