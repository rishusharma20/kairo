import { fetchUsersAction } from "./actions";
import { UsersClient } from "./users-client";

export default async function AdminUsersPage() {
  // Fetch the initial set of users on the server for instant rendering
  const initialUsers = await fetchUsersAction();

  return <UsersClient initialUsers={initialUsers} />;
}
