import createClient from "../supabase/index.ts";

export async function fetchPermissions(
  roles: string[] = [],
): Promise<string[]> {
  const supabase = createClient();
  const { data: rolePermissions, error: rolePermissionsError } = await supabase
    .from("ev_role_permissions")
    .select("id")
    .in("role", roles);

  if (rolePermissionsError) {
    throw new Error(
      "Error fetching role permissions" + JSON.stringify(rolePermissionsError),
    );
  }

  return [
    ...new Set(
      rolePermissions?.map((x: { id: string }) => x.id).filter(Boolean) ?? [],
    ),
  ];
}
